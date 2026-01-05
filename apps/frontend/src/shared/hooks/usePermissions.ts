import { useMemo } from "react";

type PermissionsInput = unknown;

export default function usePermissions(permissionsInput?: PermissionsInput) {
  const permissions = useMemo(() => {
    if (Array.isArray(permissionsInput)) {
      return permissionsInput.filter((p): p is string => typeof p === "string");
    }
    if (typeof permissionsInput === "string") return [permissionsInput];
    return [];
  }, [permissionsInput]);

  const hasWildcard = useMemo(() => permissions.includes("*"), [permissions]);

  const can = useMemo(() => {
    return (permission: string) => hasWildcard || permissions.includes(permission);
  }, [hasWildcard, permissions]);

  const canAny = useMemo(() => {
    return (required: string[]) => hasWildcard || required.some((p) => permissions.includes(p));
  }, [hasWildcard, permissions]);

  const canAll = useMemo(() => {
    return (required: string[]) => hasWildcard || required.every((p) => permissions.includes(p));
  }, [hasWildcard, permissions]);

  return { permissions, hasWildcard, can, canAny, canAll };
}

