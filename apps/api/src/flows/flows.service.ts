import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlowGraph, validateFlowGraph } from '@platform/flow-core';

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(orgId: string, botId?: string) {
    return this.prisma.flow.findMany({
      where: { organizationId: orgId, ...(botId ? { botId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(orgId: string, flowId: string) {
    const flow = await this.prisma.flow.findFirst({
      where: { id: flowId, organizationId: orgId },
      include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
    });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async create(orgId: string, actorUserId: string, botId: string, name: string) {
    const bot = await this.prisma.bot.findFirst({ where: { id: botId, organizationId: orgId } });
    if (!bot) throw new NotFoundException('Bot not found');

    const flow = await this.prisma.flow.create({
      data: { organizationId: orgId, workspaceId: bot.workspaceId, botId, name },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'flow.created',
      targetType: 'flow',
      targetId: flow.id,
    });
    return flow;
  }

  async updateDraft(orgId: string, actorUserId: string, flowId: string, graph: FlowGraph) {
    await this.get(orgId, flowId);
    const flow = await this.prisma.flow.update({
      where: { id: flowId },
      data: { draftGraph: graph as unknown as object },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'flow.draft_updated',
      targetType: 'flow',
      targetId: flowId,
    });
    return flow;
  }

  async validate(orgId: string, flowId: string) {
    const flow = await this.get(orgId, flowId);
    const issues = validateFlowGraph(flow.draftGraph as unknown as FlowGraph);
    return { valid: issues.length === 0, issues };
  }

  /**
   * Publishing (plan §6.4): validate, snapshot the draft into an immutable
   * FlowVersion with a content hash, and point the bot's active deployment at
   * the new version.
   */
  async publish(orgId: string, actorUserId: string, flowId: string) {
    const flow = await this.get(orgId, flowId);
    const graph = flow.draftGraph as unknown as FlowGraph;

    const issues = validateFlowGraph(graph);
    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Flow validation failed',
        issues,
      });
    }

    const contentHash = createHash('sha256').update(JSON.stringify(graph)).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.flowVersion.findFirst({
        where: { flowId },
        orderBy: { version: 'desc' },
      });

      if (latest && latest.contentHash === contentHash) {
        throw new BadRequestException('No changes since the last published version');
      }

      const version = await tx.flowVersion.create({
        data: {
          organizationId: orgId,
          flowId,
          version: (latest?.version ?? 0) + 1,
          graph: graph as unknown as object,
          contentHash,
          publishedById: actorUserId,
        },
      });

      await tx.botDeployment.updateMany({
        where: { botId: flow.botId, active: true },
        data: { active: false, deactivatedAt: new Date() },
      });
      const deployment = await tx.botDeployment.create({
        data: {
          organizationId: orgId,
          botId: flow.botId,
          flowVersionId: version.id,
          deployedById: actorUserId,
        },
      });
      await tx.bot.update({ where: { id: flow.botId }, data: { status: 'PUBLISHED' } });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId,
          action: 'flow.published',
          targetType: 'flow_version',
          targetId: version.id,
          metadata: { flowId, version: version.version, deploymentId: deployment.id },
        },
      });

      return { version, deployment };
    });
  }
}
