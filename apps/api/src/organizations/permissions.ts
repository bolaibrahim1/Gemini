import { OrgRole } from '@platform/database';

export type Permission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'members:read'
  | 'members:invite'
  | 'members:update'
  | 'members:remove'
  | 'workspaces:read'
  | 'workspaces:manage'
  | 'bots:read'
  | 'bots:manage'
  | 'bots:publish'
  | 'flows:read'
  | 'flows:manage'
  | 'audit:read';

const VIEWER_PERMISSIONS: Permission[] = ['org:read', 'workspaces:read', 'bots:read', 'flows:read'];

const AGENT_PERMISSIONS: Permission[] = [...VIEWER_PERMISSIONS];

const ANALYST_PERMISSIONS: Permission[] = [...VIEWER_PERMISSIONS];

const BOT_BUILDER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'bots:manage',
  'bots:publish',
  'flows:manage',
];

const SUPERVISOR_PERMISSIONS: Permission[] = [...VIEWER_PERMISSIONS, 'members:read'];

const CAMPAIGN_MANAGER_PERMISSIONS: Permission[] = [...VIEWER_PERMISSIONS];

const ADMIN_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'org:update',
  'members:read',
  'members:invite',
  'members:update',
  'members:remove',
  'workspaces:manage',
  'bots:manage',
  'bots:publish',
  'flows:manage',
  'audit:read',
];

const OWNER_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS, 'org:delete'];

export const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<Permission>> = {
  [OrgRole.OWNER]: new Set(OWNER_PERMISSIONS),
  [OrgRole.ADMIN]: new Set(ADMIN_PERMISSIONS),
  [OrgRole.BOT_BUILDER]: new Set(BOT_BUILDER_PERMISSIONS),
  [OrgRole.SUPERVISOR]: new Set(SUPERVISOR_PERMISSIONS),
  [OrgRole.AGENT]: new Set(AGENT_PERMISSIONS),
  [OrgRole.CAMPAIGN_MANAGER]: new Set(CAMPAIGN_MANAGER_PERMISSIONS),
  [OrgRole.ANALYST]: new Set(ANALYST_PERMISSIONS),
  [OrgRole.VIEWER]: new Set(VIEWER_PERMISSIONS),
};

export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
