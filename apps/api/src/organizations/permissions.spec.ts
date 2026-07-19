import { OrgRole } from '@platform/database';
import { ROLE_PERMISSIONS, roleHasPermission } from './permissions';

describe('role permissions', () => {
  it('gives every role read access to the organization', () => {
    for (const role of Object.values(OrgRole)) {
      expect(roleHasPermission(role, 'org:read')).toBe(true);
    }
  });

  it('reserves org deletion for owners', () => {
    expect(roleHasPermission(OrgRole.OWNER, 'org:delete')).toBe(true);
    for (const role of Object.values(OrgRole).filter((r) => r !== OrgRole.OWNER)) {
      expect(roleHasPermission(role, 'org:delete')).toBe(false);
    }
  });

  it('allows bot builders to manage and publish bots but not manage members', () => {
    expect(roleHasPermission(OrgRole.BOT_BUILDER, 'bots:manage')).toBe(true);
    expect(roleHasPermission(OrgRole.BOT_BUILDER, 'bots:publish')).toBe(true);
    expect(roleHasPermission(OrgRole.BOT_BUILDER, 'flows:manage')).toBe(true);
    expect(roleHasPermission(OrgRole.BOT_BUILDER, 'members:invite')).toBe(false);
    expect(roleHasPermission(OrgRole.BOT_BUILDER, 'members:remove')).toBe(false);
  });

  it('denies viewers, agents, and analysts all write permissions', () => {
    const writePermissions = [
      'org:update',
      'members:invite',
      'members:update',
      'members:remove',
      'workspaces:manage',
      'bots:manage',
      'bots:publish',
      'flows:manage',
    ] as const;
    for (const role of [OrgRole.VIEWER, OrgRole.AGENT, OrgRole.ANALYST]) {
      for (const permission of writePermissions) {
        expect(roleHasPermission(role, permission)).toBe(false);
      }
    }
  });

  it('defines a permission set for every role', () => {
    for (const role of Object.values(OrgRole)) {
      expect(ROLE_PERMISSIONS[role].size).toBeGreaterThan(0);
    }
  });
});
