"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import Select from "@/shared/components/form/Select";
import { EnvelopeIcon, LockIcon } from "@/shared/icons";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import CardHeader from "@/shared/components/common/CardHeader";
import PhoneInput from "@/shared/components/form/group-input/PhoneInput";
import { formatPhoneForDisplay, normalizePhone } from "@/shared/utils/phone";
import { normalizeUser, normalizeUsersResponse } from "@/shared/utils/users";
import { canDeleteUser, isSystemUser, isUserSystemAdmin, validateUserUpdate } from "@/shared/utils/userGuards";
import TableBodyState from "@/shared/components/table/TableBodyState";

type UserRole = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId?: string | null;
  role?: UserRole | null;
};

type RoleDefinition = {
  id: string;
  name: string;
  permissions?: string[];
};

const SYSTEM_ADMIN_EMAIL = "admin@stacktrack.io";
const SYSTEM_ADMIN_ROLE_NAME = "System Administrator";

export default function UsersSettingsCard() {
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);

  const [userError, setUserError] = useState<string | null>(null);

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [temporaryPasswordModal, setTemporaryPasswordModal] = useState<{
    context: "created" | "reset";
    name: string;
    password: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pendingResetUserId, setPendingResetUserId] = useState<string | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const [userForm, setUserForm] = useState<{
    id?: string;
    name: string;
    email: string;
    phone: string;
    roleId: string;
  }>({ id: undefined, name: "", email: "", phone: "", roleId: "" });

  const primaryRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const systemRoleId = useMemo(
    () => roles.find((role) => role.name === SYSTEM_ADMIN_ROLE_NAME)?.id || null,
    [roles]
  );

  const isRoleFullAccess = (roleId?: string | null) => {
    if (!roleId) return false;
    return Boolean(roleMap.get(roleId)?.permissions?.includes("*"));
  };

  const fullAccessUserCount = useMemo(() => {
    return users.filter((user) => isRoleFullAccess(user.roleId ?? user.role?.id)).length;
  }, [users, roleMap]);

  const systemAdminUserCount = useMemo(() => {
    if (!systemRoleId) return 0;
    return users.filter((user) => (user.roleId ?? user.role?.id) === systemRoleId).length;
  }, [systemRoleId, users]);

  const clearUserForm = () =>
    setUserForm({ id: undefined, name: "", email: "", phone: "", roleId: "" });

  const isRowConfirming = (userId: string) =>
    pendingDeleteUserId === userId || pendingResetUserId === userId;
  const isAnyConfirming = pendingDeleteUserId !== null || pendingResetUserId !== null;
  const isRowBusy = (userId: string) =>
    busyUserId === "creating" || busyUserId === userId || resettingUserId === userId;

  const loadAll = async () => {
    setLoading(true);
    setUserError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/proxy/users/all", { credentials: "include" }),
        fetch("/api/proxy/roles/all", { credentials: "include" }),
      ]);

      if (!usersRes.ok || !rolesRes.ok) throw new Error("Failed to fetch data");

      const usersJson = await usersRes.json();
      const rolesJson = await rolesRes.json();

      setUsers(normalizeUsersResponse(usersJson) as User[]);
      setRoles(rolesJson.roles || []);
    } catch {
      setUserError("Unable to load users right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const startEditUser = (user: User) => {
    setUserError(null);
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      roleId: user.roleId || user.role?.id || "",
    });
  };

  const saveUserForm = async () => {
    if (!userForm.name || !userForm.email) {
      setUserError("Name and email are required.");
      return;
    }

    const isEditing = Boolean(userForm.id);
    const existingUser = isEditing ? users.find((u) => u.id === userForm.id) : null;
    const guardCtx = {
      systemAdminEmail: SYSTEM_ADMIN_EMAIL,
      systemRoleId,
      systemAdminUserCount,
      fullAccessUserCount,
      isRoleFullAccess,
    };

    if (isEditing) {
      const check = validateUserUpdate(
        existingUser,
        { email: userForm.email, roleId: userForm.roleId || null },
        guardCtx
      );
      if (!check.ok) {
        setUserError(check.reason);
        return;
      }
    }

    setUserError(null);
    setBusyUserId(isEditing ? userForm.id! : "creating");

    try {
      if (!isEditing) {
        const newUserName = userForm.name;
        setCreatingUser(true);
        const res = await fetch("/api/proxy/user/new", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userForm.name,
            email: userForm.email,
            phone: userForm.phone || null,
            roleId: userForm.roleId || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Unable to create user");
        }
        const data = await res.json();
        const createdPassword: string | null = data?.password || null;
        clearUserForm();
        await loadAll();
        if (createdPassword) {
          setTemporaryPasswordModal({ context: "created", name: newUserName || "New user", password: createdPassword });
        }
        return;
      }

      const res = await fetch(`/api/proxy/user/${userForm.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone || null,
          roleId: userForm.roleId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to update user");
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userForm.id
            ? {
                ...(normalizeUser(data.user) as User),
              }
            : u
        )
      );
      clearUserForm();
    } catch (err: any) {
      setUserError(err.message || "Unable to save user right now.");
    } finally {
      setCreatingUser(false);
      setBusyUserId(null);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUserForm();
  };

  const handleDeleteUser = async (id: string) => {
    setBusyUserId(id);
    setUserError(null);
    try {
      const res = await fetch(`/api/proxy/user/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete user");
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      setUserError(err.message || "Unable to delete user right now.");
    } finally {
      setBusyUserId(null);
    }
  };

  const requestPasswordReset = (user: User) => {
    setUserError(null);
    setPendingDeleteUserId(null);
    setPendingResetUserId(user.id);
  };

  const handleConfirmPasswordReset = async (user: User) => {
    setResettingUserId(user.id);
    setUserError(null);
    try {
      const res = await fetch(`/api/proxy/user/${user.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          roleId: user.roleId || user.role?.id || null,
          resetPassword: true,
          firstLogin: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to reset password");
      }
      const data = await res.json();
      const password: string | null = data?.password || null;
      if (!password) {
        throw new Error("Password reset succeeded but no password returned");
      }
      setTemporaryPasswordModal({ context: "reset", name: user.name, password });
      setPendingResetUserId(null);
      await loadAll();
    } catch (err: any) {
      setUserError(err?.message || "Unable to reset password right now.");
    } finally {
      setResettingUserId(null);
    }
  };

  const requestDeleteUser = (user: User) => {
    const guardCtx = {
      systemAdminEmail: SYSTEM_ADMIN_EMAIL,
      systemRoleId,
      systemAdminUserCount,
      fullAccessUserCount,
      isRoleFullAccess,
    };
    const check = canDeleteUser(user, guardCtx);
    if (!check.ok) {
      setUserError(check.reason);
      return;
    }
    setPendingResetUserId(null);
    setPendingDeleteUserId(user.id);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        return true;
      } catch {
        return false;
      }
    }
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

  const editingUser = Boolean(userForm.id);
  const currentEditingUser = editingUser ? users.find((u) => u.id === userForm.id) : null;
  const editingSystemUser = isSystemUser(currentEditingUser, { systemAdminEmail: SYSTEM_ADMIN_EMAIL });
  const blockRoleChange =
    editingSystemUser ||
    (systemAdminUserCount <= 1 && isUserSystemAdmin(currentEditingUser, { systemRoleId }));

  return (
    <>
      <div
        id="settings-users"
        className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-theme-lg"
      >
        <CardHeader
          eyebrow="Administration"
          title="Users"
          description="Manage user accounts, roles, and password resets."
        />

        <div className="space-y-6 p-5">
          {temporaryPasswordModal ? (
            <div className="rounded-2xl border border-app bg-app p-4 shadow-sm sm:p-5">
              <div className="mb-4 space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  {temporaryPasswordModal.context === "reset" ? "Password reset" : "User created"}
                </p>
                <h4 className="text-base font-semibold text-app">Temporary password generated</h4>
                <p className="text-sm text-app-muted">
                  Share this password securely with {temporaryPasswordModal.name || "the user"}. They may be asked to
                  change it on their first login.
                </p>
              </div>
              <div className="mb-4 rounded-2xl border border-dashed border-app bg-app-subtle px-4 py-3 text-center text-base font-mono tracking-[0.3em] text-app">
                {temporaryPasswordModal.password}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const ok = await copyText(temporaryPasswordModal.password);
                    setToastMessage(ok ? "Temporary password copied to clipboard" : "Unable to copy password");
                  }}
                >
                  Copy
                </Button>
                <Button size="sm" type="button" onClick={() => setTemporaryPasswordModal(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col rounded-2xl border border-app bg-app p-4 sm:p-5">
              <CardHeader
                size="sm"
                eyebrow="User"
                title={editingUser ? "Edit user" : "Add user"}
                className="mb-4"
              />

              {editingSystemUser ? (
                <div className="mb-4 rounded-lg border border-blue-light-200 bg-blue-light-50 px-3 py-2 text-sm text-blue-light-800 dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-50">
                  System Administrator is a protected account. Email and role cannot be changed.
                </div>
              ) : null}

              {systemRoleId && systemAdminUserCount === 0 ? (
                <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 dark:border-error-500/40 dark:bg-error-900/30 dark:text-error-200">
                  No System Administrator user exists. Create a user assigned to{" "}
                  <span className="font-medium">System Administrator</span> before continuing.
                </div>
              ) : null}

              <form onSubmit={handleSubmitUser} className="flex flex-col gap-3">
                <div className="grid gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={userForm.name}
                      disabled={editingSystemUser}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <div className="relative">
                        <Input
                          type="email"
                          value={userForm.email}
                          disabled={editingSystemUser}
                          onChange={(e) =>
                            setUserForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="pl-12"
                          placeholder="user@example.com"
                        />
                        <span className="absolute inset-y-0 left-0 flex h-full items-center border-r border-divider px-3 text-app-muted">
                          <span className="flex h-5 w-5 items-center justify-center">
                            <EnvelopeIcon className="h-4 w-4 shrink-0" />
                          </span>
                        </span>
                  </div>
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <PhoneInput
                        country="US"
                        placeholder="(555) 555-5555"
                        value={formatPhoneForDisplay(userForm.phone, { emptyDisplay: "" })}
                        onChange={(value) => {
                          if (editingSystemUser) return;
                          setUserForm((prev) => ({
                            ...prev,
                            phone: normalizePhone(value) || "",
                          }));
                        }}
                        disabled={editingSystemUser}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={userForm.roleId || "__placeholder__"}
                      disabled={blockRoleChange}
                      placeholder="Select Role"
                      placeholderValue="__placeholder__"
                      defaultValue="__placeholder__"
                      onChange={(value) =>
                        setUserForm((prev) => ({ ...prev, roleId: value === "__none__" ? "" : value }))
                      }
                      options={[
                        { value: "__none__", label: "No Role" },
                        ...primaryRoles.map((role) => ({ value: role.id, label: role.name })),
                      ]}
                      className="mt-1"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2 sm:mt-0">
                    {editingUser ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUserError(null);
                          setPendingDeleteUserId(null);
                          setPendingResetUserId(null);
                          clearUserForm();
                        }}
                        disabled={busyUserId === userForm.id}
                      >
                        Cancel
                      </Button>
                    ) : null}

                    {editingSystemUser ? null : (
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          creatingUser ||
                          busyUserId === "creating" ||
                          (editingUser && busyUserId === userForm.id)
                        }
                      >
                        {editingUser
                          ? busyUserId === userForm.id
                            ? "Saving..."
                            : "Save"
                          : creatingUser
                            ? "Creating..."
                            : "Add User"}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-app bg-app">
              <div className="max-w-full max-h-[260px] overflow-x-auto overflow-y-auto">
                <Table className="min-w-full border-collapse">
                  <TableHeader className="sticky top-0 z-10 border-b border-divider-strong bg-app-subtle">
                    <TableRow>
                      <TableCell isHeader className="w-[220px] px-4 py-3 text-left whitespace-nowrap">
                        <p className="text-sm font-medium text-app">User</p>
                      </TableCell>
                      <TableCell isHeader className="w-[220px] px-4 py-3 text-left whitespace-nowrap">
                        <p className="text-sm font-medium text-app">Contact</p>
                      </TableCell>
                      <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                        <p className="text-sm font-medium text-app">Actions</p>
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableBodyState colSpan={3} isEmpty={users.length === 0} emptyText="No users found." />
                    {users.map((user) => (
                        <TableRow key={user.id} className="transition hover:bg-app-subtle">
                          <TableCell className="w-[220px] px-4 py-3 text-left whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="text-sm font-medium text-app">{user.name}</span>
                              <p className="text-sm text-app-muted">{user.role?.name || "—"}</p>
                            </div>
                          </TableCell>
                        <TableCell className="w-[220px] px-4 py-3 text-left whitespace-nowrap">
                          <div className="space-y-0.5">
                              <p className="text-sm text-app">
                                {formatPhoneForDisplay(user.phone, { emptyDisplay: "—" })}
                              </p>
                              <p className="text-sm text-app-muted">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                            {isSystemUser(user, { systemAdminEmail: SYSTEM_ADMIN_EMAIL }) ? (
                              <div className="w-full rounded-lg border border-blue-light-200 bg-blue-light-50 px-3 py-2 text-sm text-blue-light-800 dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-50">
                                User is protected.
                              </div>
                            ) : (
                              <ActionIconGroup
                                stopPropagation
                                confirming={isRowConfirming(user.id)}
                                editing={Boolean(userForm.id) && userForm.id === user.id}
                                onConfirmEdit={async () => {
                                  await saveUserForm();
                                }}
                                confirmEditDisabled={isRowBusy(user.id)}
                                onCancelEdit={() => {
                                  setUserError(null);
                                  setPendingDeleteUserId(null);
                                  setPendingResetUserId(null);
                                  clearUserForm();
                                }}
                                extraActions={[
                                  {
                                    key: "reset-password",
                                    label: "Reset password",
                                    icon: <LockIcon className="h-4 w-4" />,
                                    tone: "warning",
                                    onClick: () => {
                                      setPendingDeleteUserId(null);
                                      requestPasswordReset(user);
                                    },
                                    disabled:
                                      isRowBusy(user.id) || isAnyConfirming,
                                  },
                                ]}
                                onEdit={() => {
                                  setPendingDeleteUserId(null);
                                  setPendingResetUserId(null);
                                  startEditUser(user);
                                }}
                                onRequestDelete={() => {
                                  setPendingResetUserId(null);
                                  requestDeleteUser(user);
                                }}
                                onConfirm={async () => {
                                  if (pendingResetUserId === user.id) {
                                    await handleConfirmPasswordReset(user);
                                    return;
                                  }
                                  if (pendingDeleteUserId === user.id) {
                                    setPendingDeleteUserId(null);
                                    await handleDeleteUser(user.id);
                                  }
                                }}
                                onCancel={() => {
                                  setPendingDeleteUserId(null);
                                  setPendingResetUserId(null);
                                }}
                                editDisabled={isAnyConfirming}
                                deleteDisabled={
                                  isRowBusy(user.id) || isAnyConfirming
                                }
                                confirmDisabled={
                                  isRowBusy(user.id)
                                }
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {userError ? (
            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 dark:border-error-500/40 dark:bg-error-900/30 dark:text-error-200">
              {userError}
            </div>
          ) : null}

        </div>
      </div>

      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-5 z-[99999] flex justify-center">
          <div
            className="pointer-events-auto rounded-full border border-app bg-app px-4 py-2 text-sm text-app shadow-theme-lg"
            role="status"
            aria-live="polite"
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </>
  );
}
