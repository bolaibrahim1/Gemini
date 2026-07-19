import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BotStatus,
  Channel,
  ConversationOwnership,
  ConversationStatus,
  FlowExecutionStatus,
  MessageDirection,
  Prisma,
} from '@platform/database';
import {
  EngineEffect,
  EngineState,
  FlowGraph,
  OutboundMessage,
  StepTrace,
  startExecution,
  tick,
} from '@platform/flow-core';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface InboundMessageInput {
  organizationId: string;
  botId: string;
  channel: Channel;
  text: string;
  conversationId?: string;
  /** Channel identity for contact resolution (wa_id, widget visitor id, ...). */
  contactExternalId?: string;
  /** Channel event id for webhook deduplication. */
  idempotencyKey?: string;
}

export interface InboundProcessingResult {
  conversationId: string;
  executionId: string | null;
  status: 'replied' | 'waiting_human' | 'duplicate' | 'bot_inactive';
  outputs: OutboundMessage[];
  executionStatus?: FlowExecutionStatus;
}

const ENGINE_TO_DB_STATUS: Record<EngineState['status'], FlowExecutionStatus> = {
  created: FlowExecutionStatus.CREATED,
  running: FlowExecutionStatus.RUNNING,
  waiting_input: FlowExecutionStatus.WAITING_INPUT,
  handed_over: FlowExecutionStatus.HANDED_OVER,
  completed: FlowExecutionStatus.COMPLETED,
  failed: FlowExecutionStatus.FAILED,
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Inbox reads (plan §6.11 foundation)
  // -------------------------------------------------------------------------

  list(orgId: string, status?: ConversationStatus) {
    return this.prisma.conversation.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: {
        contact: { select: { id: true, displayName: true, language: true, tags: true } },
        bot: { select: { id: true, name: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: 100,
    });
  }

  async get(orgId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: orgId },
      include: {
        contact: true,
        bot: { select: { id: true, name: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { steps: { orderBy: { index: 'asc' } } },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  /** Return a handed-over conversation to the bot (plan §6.11). */
  async returnToBot(orgId: string, actorUserId: string, conversationId: string) {
    const conversation = await this.get(orgId, conversationId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { ownership: ConversationOwnership.BOT, status: ConversationStatus.OPEN },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'conversation.returned_to_bot',
      targetType: 'conversation',
      targetId: conversationId,
    });
    return updated;
  }

  async resolve(orgId: string, actorUserId: string, conversationId: string) {
    const conversation = await this.get(orgId, conversationId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { ownership: ConversationOwnership.CLOSED, status: ConversationStatus.RESOLVED },
    });
    await this.prisma.flowExecution.updateMany({
      where: {
        conversationId: conversation.id,
        status: { in: [FlowExecutionStatus.RUNNING, FlowExecutionStatus.WAITING_INPUT] },
      },
      data: { status: FlowExecutionStatus.CANCELLED },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'conversation.resolved',
      targetType: 'conversation',
      targetId: conversationId,
    });
    return updated;
  }

  // -------------------------------------------------------------------------
  // Inbound processing (plan §6.5) — used by the simulator now and by the
  // channel webhooks + flow worker as they land.
  // -------------------------------------------------------------------------

  async processInbound(input: InboundMessageInput): Promise<InboundProcessingResult> {
    const bot = await this.prisma.bot.findFirst({
      where: { id: input.botId, organizationId: input.organizationId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    const conversation = await this.resolveConversation(input, bot.defaultLanguage);

    // Deduplicate webhook redeliveries before doing anything else.
    try {
      await this.prisma.message.create({
        data: {
          organizationId: input.organizationId,
          conversationId: conversation.id,
          direction: MessageDirection.INBOUND,
          type: 'text',
          content: { text: input.text },
          idempotencyKey: input.idempotencyKey,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return {
          conversationId: conversation.id,
          executionId: null,
          status: 'duplicate',
          outputs: [],
        };
      }
      throw error;
    }
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // The bot must not auto-reply while a human owns the conversation (§6.5).
    if (conversation.ownership !== ConversationOwnership.BOT) {
      return {
        conversationId: conversation.id,
        executionId: null,
        status: 'waiting_human',
        outputs: [],
      };
    }

    // Pausing a bot stops new automated executions (§6.3), but an execution
    // that is already waiting for input is allowed to finish.
    let execution = await this.prisma.flowExecution.findFirst({
      where: {
        conversationId: conversation.id,
        status: { in: [FlowExecutionStatus.RUNNING, FlowExecutionStatus.WAITING_INPUT] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!execution) {
      if (bot.status !== BotStatus.PUBLISHED) {
        return {
          conversationId: conversation.id,
          executionId: null,
          status: 'bot_inactive',
          outputs: [],
        };
      }
      const deployment = await this.prisma.botDeployment.findFirst({
        where: { botId: bot.id, active: true },
      });
      if (!deployment) {
        return {
          conversationId: conversation.id,
          executionId: null,
          status: 'bot_inactive',
          outputs: [],
        };
      }
      execution = await this.prisma.flowExecution.create({
        data: {
          organizationId: input.organizationId,
          conversationId: conversation.id,
          botId: bot.id,
          flowVersionId: deployment.flowVersionId,
          status: FlowExecutionStatus.CREATED,
        },
      });
    }

    const flowVersion = await this.prisma.flowVersion.findUnique({
      where: { id: execution.flowVersionId },
    });
    if (!flowVersion) throw new NotFoundException('Flow version not found');
    const contact = await this.prisma.contact.findUnique({
      where: { id: conversation.contactId },
    });

    const state: EngineState = {
      status:
        execution.status === FlowExecutionStatus.CREATED
          ? 'created'
          : execution.status === FlowExecutionStatus.WAITING_INPUT
            ? 'waiting_input'
            : 'running',
      currentNodeId: null,
      waitingNodeId: execution.waitingNodeId,
      variables: (execution.variables as Record<string, never>) ?? {},
      stepCount: execution.stepCount,
    };

    const result = tick(
      flowVersion.graph as unknown as FlowGraph,
      state,
      // A fresh execution consumes no input: the inbound message triggered it.
      execution.status === FlowExecutionStatus.WAITING_INPUT ? input.text : null,
      {
        now: new Date(),
        timezone: bot.defaultLanguage === 'ar' ? 'Africa/Cairo' : 'UTC',
        contact: {
          attributes: (contact?.attributes as Record<string, never>) ?? {},
          tags: contact?.tags ?? [],
        },
        language: (bot.defaultLanguage as 'ar' | 'en') ?? 'ar',
      },
    );

    await this.persistTick(input.organizationId, conversation.id, execution.id, result.state, {
      outputs: result.outputs,
      effects: result.effects,
      steps: result.steps,
      previousStepCount: execution.stepCount,
      contactId: conversation.contactId,
    });

    return {
      conversationId: conversation.id,
      executionId: execution.id,
      status: 'replied',
      outputs: result.outputs,
      executionStatus: ENGINE_TO_DB_STATUS[result.state.status],
    };
  }

  private async resolveConversation(input: InboundMessageInput, defaultLanguage: string) {
    if (input.conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: input.organizationId,
          botId: input.botId,
        },
      });
      if (!existing) throw new NotFoundException('Conversation not found');
      return existing;
    }

    // Resolve or create the contact by channel identity, then open a
    // conversation (plan §6.5 "Resolve tenant, channel, contact, ...").
    const externalId = input.contactExternalId ?? null;
    let contact = externalId
      ? await this.prisma.contact.findUnique({
          where: {
            organizationId_externalId: {
              organizationId: input.organizationId,
              externalId,
            },
          },
        })
      : null;
    contact ??= await this.prisma.contact.create({
      data: {
        organizationId: input.organizationId,
        externalId,
        displayName: externalId ?? 'Visitor',
        language: defaultLanguage,
      },
    });

    const open = await this.prisma.conversation.findFirst({
      where: {
        organizationId: input.organizationId,
        botId: input.botId,
        contactId: contact.id,
        channel: input.channel,
        status: { in: [ConversationStatus.NEW, ConversationStatus.OPEN, ConversationStatus.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return open;

    return this.prisma.conversation.create({
      data: {
        organizationId: input.organizationId,
        botId: input.botId,
        contactId: contact.id,
        channel: input.channel,
      },
    });
  }

  private async persistTick(
    orgId: string,
    conversationId: string,
    executionId: string,
    state: EngineState,
    data: {
      outputs: OutboundMessage[];
      effects: EngineEffect[];
      steps: StepTrace[];
      previousStepCount: number;
      contactId: string;
    },
  ) {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    operations.push(
      this.prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: ENGINE_TO_DB_STATUS[state.status],
          waitingNodeId: state.waitingNodeId,
          variables: state.variables as Prisma.InputJsonValue,
          stepCount: state.stepCount,
          error: state.error,
        },
      }),
    );

    if (data.steps.length > 0) {
      operations.push(
        this.prisma.flowExecutionStep.createMany({
          data: data.steps.map((step, i) => ({
            executionId,
            index: data.previousStepCount + i + 1,
            nodeId: step.nodeId,
            nodeType: step.nodeType,
            status: step.status,
            detail: step.detail,
          })),
          skipDuplicates: true,
        }),
      );
    }

    if (data.outputs.length > 0) {
      operations.push(
        this.prisma.message.createMany({
          data: data.outputs.map((output) => ({
            organizationId: orgId,
            conversationId,
            direction: MessageDirection.OUTBOUND,
            type: output.type,
            content: output.content as Prisma.InputJsonValue,
          })),
        }),
      );
      operations.push(
        this.prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        }),
      );
    }

    for (const effect of data.effects) {
      if (effect.type === 'add_tag') {
        operations.push(
          this.prisma.$executeRaw`UPDATE contacts SET tags = array_append(tags, ${effect.tag}) WHERE id = ${data.contactId} AND NOT (${effect.tag} = ANY(tags))`,
        );
      } else if (effect.type === 'remove_tag') {
        operations.push(
          this.prisma.$executeRaw`UPDATE contacts SET tags = array_remove(tags, ${effect.tag}) WHERE id = ${data.contactId}`,
        );
      } else if (effect.type === 'handover') {
        operations.push(
          this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
              ownership: ConversationOwnership.WAITING_HUMAN,
              status: ConversationStatus.PENDING,
            },
          }),
        );
      }
      // webhook_requested effects are trace-only until the integrations
      // worker lands (plan phase V1 external tools).
    }

    await this.prisma.$transaction(operations);
  }
}
