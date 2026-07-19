import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(orgId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(orgId: string, actorUserId: string, name: string) {
    const workspace = await this.prisma.workspace.create({
      data: { organizationId: orgId, name },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'workspace.created',
      targetType: 'workspace',
      targetId: workspace.id,
    });
    return workspace;
  }

  async rename(orgId: string, actorUserId: string, workspaceId: string, name: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Workspace not found');

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'workspace.renamed',
      targetType: 'workspace',
      targetId: workspaceId,
    });
    return workspace;
  }
}
