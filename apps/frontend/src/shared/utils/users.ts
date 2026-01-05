export type NormalizedUserRole = {
  id: string;
  name: string;
};

export type NormalizedUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId?: string | null;
  role?: NormalizedUserRole | null;
};

const coerceString = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
};

export function normalizeUser(raw: any): NormalizedUser {
  const roleFromArray =
    Array.isArray(raw?.roles) && raw.roles.length > 0 ? raw.roles[0] : null;
  const rawRole = raw?.role ?? roleFromArray ?? null;

  const role: NormalizedUserRole | null = rawRole?.id
    ? { id: coerceString(rawRole.id), name: coerceString(rawRole?.name) }
    : null;

  const roleIdRaw = raw?.roleId ?? rawRole?.id ?? roleFromArray?.id ?? null;

  return {
    id: coerceString(raw?.id),
    name: coerceString(raw?.name),
    email: coerceString(raw?.email),
    phone: raw?.phone == null ? null : coerceString(raw?.phone),
    roleId: roleIdRaw == null ? null : coerceString(roleIdRaw),
    role,
  };
}

export function normalizeUsersResponse(usersJson: any): NormalizedUser[] {
  const rawUsers = usersJson?.users;
  if (!Array.isArray(rawUsers)) return [];
  return rawUsers.map(normalizeUser);
}

