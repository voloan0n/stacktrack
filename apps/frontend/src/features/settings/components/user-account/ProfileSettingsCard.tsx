"use client";

import React, { useEffect, useMemo, useState } from "react";
import Button from "@/shared/components/ui/button/Button";
import { useAuth } from "@/features/auth/lib/provider";
import { getClientUser } from "@/features/auth/lib/client";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import CardHeader from "@/shared/components/common/CardHeader";
import { PencilIcon } from "@/shared/icons";
import UserClientForm from "@/features/clients/components/UserClientForm";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  accentColor?: string | null;
};

export default function ProfileSettingsCard() {
  const auth = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatUser = (incoming: any): UserProfile | null => {
    if (!incoming) return null;
    return {
      id: incoming.id ?? "",
      name: incoming.name ?? "",
      email: incoming.email ?? "",
      phone: incoming.phone ?? null,
      role: incoming.role?.name ?? incoming.role ?? "User",
      accentColor: incoming.accentColor ?? incoming.avatarColor ?? "primary",
    };
  };

  const initialUser = useMemo(() => formatUser(auth?.user), [auth?.user]);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }

    setLoading(true);
    getClientUser()
      .then((fetched) => {
        const formatted = formatUser(fetched);
        setUser(formatted);
        setError(formatted ? null : "Unable to load your profile right now.");
        if (formatted && auth?.setUser) {
          auth.setUser({ ...fetched, ...formatted });
        }
      })
      .catch(() => setError("Unable to load your profile right now."))
      .finally(() => setLoading(false));
  }, [auth?.setUser, initialUser]);

  if (loading) {
    return (
      <div className="p-5 border border-app rounded-2xl bg-app-subtle lg:p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-5 border border-red-100 bg-red-50/60 rounded-2xl text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 lg:p-6">
        {error || "We couldn't load your profile details."}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-sm">
      {/* ========================================================= */}
      {/*                      HEADER SECTION                       */}
      {/* ========================================================= */}
      <CardHeader
        eyebrow="Profile"
        title="Account overview"
        description="Manage your personal details and keep your contact info up to date."
      >
        <Button
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          variant="outline"
          size="sm"
          startIcon={<PencilIcon className="h-4 w-4" />}
          type="button"
        >
          Edit profile
        </Button>
      </CardHeader>

      {/* ========================================================= */}
      {/*                         CONTENT                           */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start lg:px-6">
        <div className="flex w-full items-center gap-4 lg:w-auto">
          <UserIcon name={user.name} color={user.accentColor} size="lg" className="h-16 w-16 text-lg" />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3 lg:justify-end">
          <div className="rounded-xl border border-app bg-app px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-muted">Name</p>
            <p className="truncate text-base font-semibold text-app">{user.name || "Unknown"}</p>
          </div>

          <div className="rounded-xl border border-app bg-app px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-muted">Email</p>
            <p className="truncate text-base font-semibold text-app">{user.email}</p>
          </div>

          <div className="rounded-xl border border-app bg-app px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-app-muted">Role</p>
            <p className="truncate text-base font-semibold text-app">{user.role}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-t border-amber-100 bg-amber-50/80 px-6 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <UserClientForm
        client={{ id: user.id, name: user.name, email: user.email, phone: user.phone ?? "" }}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        disableDetailFetch
        disabledSections={{ address: true, notes: true }}
        onSave={async (data) => {
          setSaving(true);
          setError(null);
          try {
            const res = await fetch(`/api/proxy/user/profile`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data?.name,
                email: data?.email,
                phone: data?.phone ?? null,
              }),
            });
            if (!res.ok) throw new Error("We couldn't save your changes. Please try again.");
            const json = await res.json().catch(() => null);
            const updated = formatUser(json?.user) ?? user;
            setUser(updated);
            auth?.setUser?.((prev: any) => ({ ...(prev || {}), ...updated }));
            setModalOpen(false);
          } catch (err: any) {
            setError(err?.message || "Unexpected error while saving changes.");
          } finally {
            setSaving(false);
          }
        }}
      />

      {/* ========================================================= */}
      {/*                          FOOTER                           */}
      {/* ========================================================= */}
      {saving ? (
        <div className="border-t border-app bg-app px-6 py-3 text-sm text-app">Saving…</div>
      ) : null}
    </section>
  );
}
