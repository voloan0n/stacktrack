"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import Select from "@/shared/components/form/Select";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import CardHeader from "@/shared/components/common/CardHeader";

type User = {
  id: string;
  roleId?: string | null;
  role?: { id: string } | null;
};

type RoleDefinition = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: string[];
};

const PERMISSION_OPTIONS: {
  id: string;
  label: string;
  group: "Tickets" | "Clients" | "Users & Settings";
}[] = [
  { id: "ticket.view", label: "View tickets", group: "Tickets" },
  { id: "ticket.create", label: "Create tickets", group: "Tickets" },
  { id: "ticket.update", label: "Update tickets", group: "Tickets" },
  { id: "ticket.assign", label: "Assign/transfer tickets", group: "Tickets" },
  { id: "ticket.comment", label: "Comment on tickets", group: "Tickets" },
  { id: "ticket.internal.view", label: "View internal-only tickets", group: "Tickets" },
  { id: "client.view", label: "View clients", group: "Clients" },
  { id: "client.manage", label: "Create/update/delete clients", group: "Clients" },
  { id: "user.manage", label: "Manage users", group: "Users & Settings" },
  { id: "settings.manage", label: "Manage roles & settings", group: "Users & Settings" },
];

const SYSTEM_ADMIN_ROLE_NAME = "System Administrator";

export default function RolesSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);

  const [roleError, setRoleError] = useState<string | null>(null);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(null);

  const [roleForm, setRoleForm] = useState<RoleDefinition>({
    id: "",
    name: "",
    description: "",
    permissions: [],
  });
  const [roleAccess, setRoleAccess] = useState<"full" | "scoped">("scoped");
  const [roleEditable, setRoleEditable] = useState(false);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const isRoleFullAccess = (roleId?: string | null) => {
    if (!roleId) return false;
    return Boolean(roleMap.get(roleId)?.permissions?.includes("*"));
  };

  const isSystemRole = (roleId?: string | null) => {
    if (!roleId) return false;
    return roleMap.get(roleId)?.name === SYSTEM_ADMIN_ROLE_NAME;
  };

  const clearRoleForm = () => {
    setRoleForm({ id: "", name: "", description: "", permissions: [] });
    setRoleAccess("scoped");
    setRoleEditable(true);
  };

  const loadAll = async () => {
    setLoading(true);
    setRoleError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/proxy/users/all", { credentials: "include" }),
        fetch("/api/proxy/roles/all", { credentials: "include" }),
      ]);

      if (!usersRes.ok || !rolesRes.ok) throw new Error("Failed to fetch data");

      const usersJson = await usersRes.json();
      const rolesJson = await rolesRes.json();

      setUsers(
        (usersJson.users || []).map((u: any) => ({
          ...u,
          roleId:
            u.roleId ??
            u.role?.id ??
            (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0]?.id : null),
          role: u.role ?? (Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : null),
        }))
      );
      setRoles(rolesJson.roles || []);
    } catch {
      setRoleError("Unable to load roles right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const startEditRole = (role: RoleDefinition) => {
    setRoleError(null);
    setRoleEditable(false);
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setRoleAccess(role.permissions?.includes("*") ? "full" : "scoped");
  };

  const cancelEditRole = () => {
    setRoleError(null);
    setPendingDeleteRoleId(null);
    if (!roleForm.id) {
      clearRoleForm();
      return;
    }
    const original = roles.find((r) => r.id === roleForm.id);
    if (original) startEditRole(original);
    setRoleEditable(false);
  };

  const PermissionGroup = ({ group }: { group: "Tickets" | "Clients" | "Users & Settings" }) => {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">{group}</p>
        <div className="space-y-1.5">
          {PERMISSION_OPTIONS.filter((p) => p.group === group).map((perm) => {
            const active =
              isSystemRole(roleForm.id || null) || (roleForm.permissions || []).includes(perm.id);
            return (
              <label
                key={perm.id}
                className="flex items-center gap-3 rounded-xl border border-app bg-app px-2.5 py-2 text-[13px] leading-snug text-app"
              >
                <input
                  type="checkbox"
                  checked={active}
                  disabled={isSystemRole(roleForm.id || null) || (Boolean(roleForm.id) && !roleEditable)}
                  onChange={(e) => {
                    const current = new Set(roleForm.permissions || []);
                    if (e.target.checked) current.add(perm.id);
                    else current.delete(perm.id);
                    setRoleForm((prev) => ({
                      ...prev,
                      permissions: Array.from(current),
                    }));
                  }}
                  className="h-4 w-4 rounded border-app"
                />
                <span className="flex-1">{perm.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const requestDeleteRole = (role: RoleDefinition) => {
    const isFullAccess = !!role.permissions?.includes("*");
    const usersAssignedToRole = users.filter((user) => (user.roleId ?? user.role?.id) === role.id)
      .length;
    const assignedFullAccessUsersExcludingRole = users.filter((user) => {
      const roleId = user.roleId ?? user.role?.id;
      if (!roleId) return false;
      if (roleId === role.id) return false;
      return isRoleFullAccess(roleId);
    }).length;

    if (isFullAccess && usersAssignedToRole > 0 && assignedFullAccessUsersExcludingRole === 0) {
      setRoleError("At least one user must retain full access to prevent admin lockout.");
      return;
    }

    setPendingDeleteRoleId(role.id);
  };

  const handleDeleteRole = async (id: string) => {
    setBusyRoleId(id);
    setRoleError(null);
    try {
      const res = await fetch(`/api/proxy/role/${id}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete role");
      }
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setRoleError(err.message || "Unable to delete role right now.");
    } finally {
      setBusyRoleId(null);
    }
  };

  const saveRoleForm = async () => {
    if (!roleForm.name.trim()) {
      setRoleError("Role name is required.");
      return;
    }

    const isEditing = Boolean(roleForm.id);
    const isFullAccess = roleAccess === "full";
    const permissions = isFullAccess
      ? ["*"]
      : Array.from(new Set((roleForm.permissions || []).filter((p) => p !== "*")));

    if (isEditing) {
      const existing = roles.find((r) => r.id === roleForm.id);
      const wasFullAccess = !!existing?.permissions?.includes("*");
      const usersAssignedToRole = users.filter((user) => (user.roleId ?? user.role?.id) === roleForm.id)
        .length;
      const assignedFullAccessUsersExcludingRole = users.filter((user) => {
        const roleId = user.roleId ?? user.role?.id;
        if (!roleId) return false;
        if (roleId === roleForm.id) return false;
        return isRoleFullAccess(roleId);
      }).length;

      if (
        wasFullAccess &&
        !isFullAccess &&
        usersAssignedToRole > 0 &&
        assignedFullAccessUsersExcludingRole === 0
      ) {
        setRoleError("At least one user must retain full access to prevent admin lockout.");
        return;
      }
    }

    setRoleError(null);
    setBusyRoleId(isEditing ? roleForm.id : "creating");
    setCreatingRole(!isEditing);

    try {
      if (!isEditing) {
        const res = await fetch("/api/proxy/role/create", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roleForm.name.trim(),
            description: roleForm.description?.trim() ? roleForm.description.trim() : null,
            permissions,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Unable to create role");
        }
        const data = await res.json();
        setRoles((prev) => [...prev, data.role]);
        clearRoleForm();
        return;
      }

      const res = await fetch(`/api/proxy/role/${roleForm.id}/update`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description?.trim() ? roleForm.description.trim() : null,
          permissions,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to update role");
      }
      const data = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === roleForm.id ? data.role : r)));
      clearRoleForm();
    } catch (err: any) {
      setRoleError(err.message || "Unable to save role right now.");
    } finally {
      setBusyRoleId(null);
      setCreatingRole(false);
    }
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRoleForm();
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-app bg-app-subtle p-6 shadow-theme-lg">
        <div className="h-4 w-1/4 animate-pulse rounded bg-app-subtle/70" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-app-subtle/60" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-app-subtle/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      id="settings-roles"
      className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-theme-lg"
    >
      <CardHeader
        eyebrow="Administration"
        title="Roles"
        description="Define role-based access control and permissions."
      />

      <div className="space-y-6 p-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col rounded-2xl border border-app bg-app p-4 sm:p-5">
            <CardHeader
              size="sm"
              eyebrow="Role"
              title={roleForm.id ? "Edit role" : "Add role"}
              className="mb-4"
            />

            <form onSubmit={handleSubmitRole} className="flex flex-col gap-3">
              <div>
                <Label>Role</Label>
                <Select
                  value={roleForm.id || "__placeholder__"}
                  onChange={(nextId) => {
                    setPendingDeleteRoleId(null);
                    if (nextId === "__new__") {
                      clearRoleForm();
                      return;
                    }
                    const selected = roles.find((r) => r.id === nextId);
                    if (selected) startEditRole(selected);
                  }}
                  placeholder="Select Role Or Create A New Role"
                  placeholderValue="__placeholder__"
                  defaultValue="__placeholder__"
                  options={[
                    { value: "__new__", label: "Create New Role" },
                    ...sortedRoles.map((role) => ({ value: role.id, label: role.name })),
                  ]}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 border-t border-divider" />
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">or</p>
                <div className="h-px flex-1 border-t border-divider" />
              </div>

	              <div className="grid gap-3">
	                <div>
	                  <Label>Role name</Label>
	                  <Input
                    value={roleForm.name}
                    disabled={isSystemRole(roleForm.id || null) || (Boolean(roleForm.id) && !roleEditable)}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Support agent"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={roleForm.description || ""}
                    disabled={isSystemRole(roleForm.id || null) || (Boolean(roleForm.id) && !roleEditable)}
                    onChange={(e) =>
                      setRoleForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Optional"
	                  />
	                </div>
	              </div>

	              <div className="rounded-xl border border-app bg-app-subtle p-3">
	                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted">
	                  Access
	                </p>
	                <div className="mt-2 grid gap-2 sm:grid-cols-2">
	                  <button
	                    type="button"
	                    disabled={isSystemRole(roleForm.id || null) || (Boolean(roleForm.id) && !roleEditable)}
	                    onClick={() => {
	                      setRoleAccess("full");
	                      setRoleForm((prev) => ({ ...prev, permissions: ["*"] }));
	                    }}
	                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
	                      roleAccess === "full"
	                        ? "border-brand-500 bg-app text-app"
	                        : "border-app bg-app text-app-muted hover:bg-app"
	                    }`.trim()}
	                  >
	                    <span
	                      className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
	                        roleAccess === "full" ? "border-brand-500" : "border-app"
	                      }`.trim()}
	                    >
	                      {roleAccess === "full" ? (
	                        <span className="h-2 w-2 rounded-full bg-brand-500" />
	                      ) : null}
	                    </span>
	                    <span className="flex-1">
	                      <span className="block font-medium text-app">Full access</span>
	                      <span className="block text-xs text-app-muted">Grants every permission.</span>
	                    </span>
	                  </button>

	                  <button
	                    type="button"
	                    disabled={isSystemRole(roleForm.id || null) || (Boolean(roleForm.id) && !roleEditable)}
	                    onClick={() => {
	                      setRoleAccess("scoped");
	                      setRoleForm((prev) => ({
	                        ...prev,
	                        permissions: (prev.permissions || []).filter((p) => p !== "*"),
	                      }));
	                    }}
	                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
	                      roleAccess === "scoped"
	                        ? "border-brand-500 bg-app text-app"
	                        : "border-app bg-app text-app-muted hover:bg-app"
	                    }`.trim()}
	                  >
	                    <span
	                      className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
	                        roleAccess === "scoped" ? "border-brand-500" : "border-app"
	                      }`.trim()}
	                    >
	                      {roleAccess === "scoped" ? (
	                        <span className="h-2 w-2 rounded-full bg-brand-500" />
	                      ) : null}
	                    </span>
	                    <span className="flex-1">
	                      <span className="block font-medium text-app">Scoped access</span>
	                      <span className="block text-xs text-app-muted">Choose a set of permissions.</span>
	                    </span>
	                  </button>
	                </div>
	              </div>
	            </form>
	          </div>

	          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-app bg-app">
	            <div className="sticky top-0 z-10 border-b border-divider bg-app-subtle px-4 py-3">
	              <p className="text-xs uppercase tracking-[0.2em] text-app-muted">Permissions</p>
	              <p className="text-sm font-semibold text-app">
	                {roleForm.name ? roleForm.name : "Role permissions"}
	              </p>
	            </div>

	            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 pb-24">
	              {isSystemRole(roleForm.id || null) ? (
	                <div className="grid gap-5 sm:grid-cols-2">
	                  <div className="space-y-5">
	                    <PermissionGroup group="Tickets" />
                  </div>
                  <div className="space-y-5">
                    <PermissionGroup group="Clients" />
                    <PermissionGroup group="Users & Settings" />
                  </div>
                </div>
              ) : roleAccess === "full" ? (
                <div className="rounded-2xl border border-app bg-app-subtle px-4 py-4 text-sm text-app-muted">
                  {isSystemRole(roleForm.id || null) ? (
                    <div className="mb-2 font-medium text-app">
                      System Administrator is a protected role and cannot be edited or deleted.
                    </div>
                  ) : null}
                  <div>Full access roles automatically include every permission.</div>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-5">
                    <PermissionGroup group="Tickets" />
                  </div>
                  <div className="space-y-5">
                    <PermissionGroup group="Clients" />
                    <PermissionGroup group="Users & Settings" />
	                  </div>
	                </div>
	              )}
	            </div>

	            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
	              {roleForm.id ? (
	                <>
	                  <ActionIconGroup
	                    confirming={pendingDeleteRoleId === roleForm.id}
	                    editing={roleEditable}
	                    onConfirmEdit={async () => {
	                      await saveRoleForm();
	                    }}
	                    confirmEditDisabled={
	                      busyRoleId === roleForm.id ||
	                      isSystemRole(roleForm.id || null) ||
	                      !roleEditable
	                    }
	                    onCancelEdit={cancelEditRole}
	                    onEdit={() => {
	                      setPendingDeleteRoleId(null);
	                      setRoleEditable(true);
	                    }}
	                    onRequestDelete={() => {
	                      const activeRole = roles.find((r) => r.id === roleForm.id);
	                      if (!activeRole) return;
	                      if (activeRole.name === SYSTEM_ADMIN_ROLE_NAME) {
	                        setRoleError("System Administrator role cannot be deleted.");
	                        return;
	                      }
	                      requestDeleteRole(activeRole);
	                    }}
	                    onConfirm={async () => {
	                      const id = roleForm.id;
	                      setPendingDeleteRoleId(null);
	                      clearRoleForm();
	                      await handleDeleteRole(id);
	                    }}
	                    onCancel={() => setPendingDeleteRoleId(null)}
	                    disabled={busyRoleId === roleForm.id || isSystemRole(roleForm.id || null)}
	                    editDisabled={roleEditable || pendingDeleteRoleId !== null}
	                    deleteDisabled={pendingDeleteRoleId !== null}
	                    confirmDisabled={busyRoleId === roleForm.id}
	                  />
	                </>
	              ) : (
	                <>
	                  <ActionIconGroup disabled />
	                  <Button
	                    type="button"
	                    size="sm"
	                    onClick={async () => {
	                      await saveRoleForm();
	                    }}
	                    disabled={creatingRole || busyRoleId === "creating"}
	                  >
	                    {creatingRole ? "Creating..." : "Add Role"}
	                  </Button>
	                </>
	              )}
	            </div>
	          </div>
	        </div>

	        {roleError ? (
          <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 dark:border-error-500/40 dark:bg-error-900/30 dark:text-error-200">
            {roleError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
