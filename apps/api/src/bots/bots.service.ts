import { Injectable, NotFoundException } from '@nestjs/common';
import { BotStatus } from '@platform/database';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBotDto, UpdateBotDto } from './dto';

@Injectable()
export class BotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(orgId: string) {
    return this.prisma.bot.findMany({
      where: { organizationId: orgId, status: { not: BotStatus.ARCHIVED } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(orgId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, organizationId: orgId },
      include: {
        deployments: {
          where: { active: true },
          include: { flowVersion: { select: { id: true, flowId: true, version: true } } },
        },
      },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async create(orgId: string, actorUserId: string, dto: CreateBotDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: dto.workspaceId, organizationId: orgId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const bot = await this.prisma.bot.create({
      data: {
        organizationId: orgId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        defaultLanguage: dto.defaultLanguage ?? 'ar',
        tone: dto.tone,
        fallbackMessage: dto.fallbackMessage,
      },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'bot.created',
      targetType: 'bot',
      targetId: bot.id,
    });
    return bot;
  }

  async update(orgId: string, actorUserId: string, botId: string, dto: UpdateBotDto) {
    await this.get(orgId, botId);
    if (dto.knowledgeBaseId) {
      const kb = await this.prisma.knowledgeBase.findFirst({
        where: { id: dto.knowledgeBaseId, organizationId: orgId },
      });
      if (!kb) throw new NotFoundException('Knowledge base not found');
    }
    const bot = await this.prisma.bot.update({ where: { id: botId }, data: dto });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'bot.updated',
      targetType: 'bot',
      targetId: botId,
    });
    return bot;
  }

  /** Pausing a bot stops new automated executions (plan §6.3). */
  async setStatus(orgId: string, actorUserId: string, botId: string, status: BotStatus) {
    await this.get(orgId, botId);
    const bot = await this.prisma.bot.update({ where: { id: botId }, data: { status } });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: `bot.${status.toLowerCase()}`,
      targetType: 'bot',
      targetId: botId,
    });
    return bot;
  }
}
