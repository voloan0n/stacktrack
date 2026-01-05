"use client";

import { useEffect, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import PasswordResetForm from "@/shared/components/common/PasswordResetForm";
import { changePasswordClient } from "@/features/auth/lib/client";
import { useAuth } from "@/features/auth/lib/provider";

export default function SecuritySettingsCard() {
  const auth = useAuth();
  const authUser = auth?.user;
  const setUser = auth?.setUser;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const id = window.setTimeout(() => setSuccessMessage(null), 2600);
    return () => window.clearTimeout(id);
  }, [successMessage]);

  return (
    <section
      id="security"
      className="overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-sm"
    >
      <CardHeader
        eyebrow="Security"
        title="Password"
        description="Update your password to keep your account secure."
      />

      <div className="space-y-4 px-5 py-6 lg:px-6">
        {authUser?.firstLogin ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
            You’re signing in with a temporary password. Please change it now.
          </div>
        ) : null}

        {successMessage ? (
          <div
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-50"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-app bg-app p-5">
          <PasswordResetForm
            heading="Change your password"
            subheading="Enter your current password, then choose a new one."
            submitLabel="Update password"
            requireCurrent
            onSubmit={async ({ currentPassword, newPassword }) => {
              const result = await changePasswordClient(currentPassword, newPassword);
              if (!result.success) {
                return { success: false, error: result.message || "Unable to update password." };
              }

              setUser?.((prev: any) => ({ ...(prev || {}), firstLogin: false }));
              setSuccessMessage("Password updated.");
              return { success: true };
            }}
          />
        </div>
      </div>
    </section>
  );
}

