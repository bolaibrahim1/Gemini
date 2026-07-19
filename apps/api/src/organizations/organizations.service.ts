import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, MemberStatus, OrgRole } from '@platform/database';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto, UpdateOrganizationDto } from './dto';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const base = slugify(dto.name) || 'org';
    const slug = `${base}-${randomBytes(3).toString('hex')}`;

    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          industry: dto.industry,
          defaultLanguage: dto.defaultLanguage ?? 'ar',
          timezone: dto.timezone ?? 'Africa/Cairo',
          members: { create: { userId, role: OrgRole.OWNER } },
          workspaces: { create: { name: dto.workspaceName ?? 'Default' } },
        },
        include: { workspaces: true },
      });
      return org;
    });

    await this.audit.log({
      organizationId: organization.id,
      actorUserId: userId,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id,
    });
    return organization;
  }

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId, status: MemberStatus.ACTIVE } } },
      include: { workspaces: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { workspaces: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, actorUserId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.update({ where: { id: orgId }, data: dto });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'organization.updated',
      targetType: 'organization',
      targetId: orgId,
      metadata: dto as Record<string, unknown>,
    });
    return org;
  }

  listMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(orgId: string, actorUserId: string, dto: InviteMemberDto) {
    if (dto.role === OrgRole.OWNER) {
      throw new BadRequestException('Ownership cannot be granted through an invitation');
    }
    const email = dto.email.toLowerCase();

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, user: { email } },
    });
    if (existingMember) {
      throw new ConflictException('This user is already a member');
    }

    const token = randomBytes(32).toString('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email,
        role: dto.role,
        tokenHash: sha256(token),
        invitedById: actorUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'member.invited',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email, role: dto.role },
    });
    // Token is handed to the mailer; never exposed via the API response.
    return { invitation, token };
  }

  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (
      !invitation ||
      invitation.status !== InvitationStatus.PENDING ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired invitation');
    }
    if (invitation.email !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was issued for a different email address');
    }

    const [membership] = await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);

    await this.audit.log({
      organizationId: invitation.organizationId,
      actorUserId: userId,
      action: 'member.joined',
      targetType: 'member',
      targetId: membership.id,
    });
    return membership;
  }

  async updateMemberRole(
    orgId: string,
    actorUserId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const member = await this.requireMember(orgId, memberId);
    if (member.role === OrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      await this.assertNotLastOwner(orgId, member.id);
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: dto.role },
    });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'member.role_changed',
      targetType: 'member',
      targetId: member.id,
      metadata: { from: member.role, to: dto.role },
    });
    return updated;
  }

  async removeMember(orgId: string, actorUserId: string, memberId: string) {
    const member = await this.requireMember(orgId, memberId);
    if (member.role === OrgRole.OWNER) {
      await this.assertNotLastOwner(orgId, member.id);
    }

    await this.prisma.organizationMember.delete({ where: { id: member.id } });
    await this.audit.log({
      organizationId: orgId,
      actorUserId,
      action: 'member.removed',
      targetType: 'member',
      targetId: member.id,
      metadata: { removedUserId: member.userId },
    });
  }

  private async requireMember(orgId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  /** Owners cannot accidentally remove the last organization owner (plan §6.2). */
  private async assertNotLastOwner(orgId: string, excludingMemberId: string) {
    const otherOwners = await this.prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        role: OrgRole.OWNER,
        status: MemberStatus.ACTIVE,
        id: { not: excludingMemberId },
      },
    });
    if (otherOwners === 0) {
      throw new BadRequestException('An organization must keep at least one owner');
    }
  }
}
