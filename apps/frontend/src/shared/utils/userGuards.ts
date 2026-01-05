export type GuardResult = { ok: true } | { ok: false; reason: string };

export type UserLike = {
  email?: string | null;
  roleId?: string | null;
  role?: { id?: string | null } | null;
};

export type UserGuardContext = {
  systemAdminEmail: string;
  systemRoleId: string | null;
  systemAdminUserCount: number;
  fullAccessUserCount: number;
  isRoleFullAccess: (roleId?: string | null) => boolean;
};

const ok = (): GuardResult => ({ ok: true });
const deny = (reason: string): GuardResult => ({ ok: false, reason });

export function isSystemUser(user: UserLike | null | undefined, ctx: Pick<UserGuardContext, "systemAdminEmail">) {
  const email = (user?.email || "").toLowerCase();
  return Boolean(email) && email === ctx.systemAdminEmail.toLowerCase();
}

export function isUserSystemAdmin(
  user: UserLike | null | undefined,
  ctx: Pick<UserGuardContext, "systemRoleId">
) {
  if (!user || !ctx.systemRoleId) return false;
  const roleId = user.roleId ?? user.role?.id ?? null;
  return roleId === ctx.systemRoleId;
}

export function canDeleteUser(user: UserLike, ctx: UserGuardContext): GuardResult {
  if (isSystemUser(user, ctx)) {
    return deny("The System Administrator account cannot be deleted.");
  }

  if (isUserSystemAdmin(user, ctx) && ctx.systemAdminUserCount <= 1) {
    return deny(
      "At least one System Administrator user is required. Create another System Administrator before deleting this user."
    );
  }

  const isFullAccessUser = ctx.isRoleFullAccess(user.roleId ?? user.role?.id ?? null);
  if (isFullAccessUser && ctx.fullAccessUserCount <= 1) {
    return deny("At least one user must retain full access to prevent admin lockout.");
  }

  return ok();
}

export function canChangeUserRole(
  user: UserLike | null | undefined,
  nextRoleId: string | null,
  ctx: UserGuardContext
): GuardResult {
  if (!user) return ok();

  if (isSystemUser(user, ctx)) {
    if (ctx.systemRoleId && nextRoleId !== ctx.systemRoleId) {
      return deny("The System Administrator account email and role cannot be changed.");
    }
    return ok();
  }

  if (ctx.systemRoleId) {
    const wasSystemAdmin = isUserSystemAdmin(user, ctx);
    const nextIsSystemAdmin = nextRoleId === ctx.systemRoleId;
    const resultingCount = ctx.systemAdminUserCount - (wasSystemAdmin ? 1 : 0) + (nextIsSystemAdmin ? 1 : 0);
    if (resultingCount <= 0) {
      return deny(
        "At least one System Administrator user is required. Create another System Administrator before saving this change."
      );
    }
  }

  return ok();
}

export function validateUserUpdate(
  existingUser: UserLike | null | undefined,
  next: { email: string; roleId: string | null },
  ctx: UserGuardContext
): GuardResult {
  if (!existingUser) return ok();

  if (isSystemUser(existingUser, ctx)) {
    if (next.email.toLowerCase() !== ctx.systemAdminEmail.toLowerCase()) {
      return deny("The System Administrator account email and role cannot be changed.");
    }
    if (ctx.systemRoleId && next.roleId !== ctx.systemRoleId) {
      return deny("The System Administrator account email and role cannot be changed.");
    }
  }

  const roleGuard = canChangeUserRole(existingUser, next.roleId, ctx);
  if (!roleGuard.ok) return roleGuard;

  const wasFullAccess = ctx.isRoleFullAccess(existingUser.roleId ?? existingUser.role?.id ?? null);
  const willBeFullAccess = ctx.isRoleFullAccess(next.roleId);
  if (wasFullAccess && !willBeFullAccess && ctx.fullAccessUserCount <= 1) {
    return deny("At least one user must retain full access to prevent admin lockout.");
  }

  return ok();
}

