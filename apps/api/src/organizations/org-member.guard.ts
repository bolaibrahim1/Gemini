import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberStatus, OrganizationMember } from '@platform/database';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Permission, roleHasPermission } from './permissions';

export const PERMISSION_KEY = 'required_permission';

/** Declares the permission a route requires within the :orgId organization. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

export interface TenantRequest extends AuthenticatedRequest {
  membership: OrganizationMember;
}

/**
 * Resolves the caller's membership in the organization named by the :orgId
 * route param and enforces the route's declared permission (plan §15.2). All
 * tenant-scoped controllers must use this guard after JwtAuthGuard.
 */
@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const rawOrgId = request.params.orgId;
    const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: request.user.id } },
    });
    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permission && !roleHasPermission(membership.role, permission)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.membership = membership;
    return true;
  }
}
