"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/lib/provider";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import Button from "@/shared/components/ui/button/Button";

type PasswordResetFormProps = {
  defaultName?: string;
  defaultEmail?: string;
  kicker?: string;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  secondaryLabel?: string;
  requireCurrent?: boolean;
  currentPasswordLabel?: string;
  currentPasswordPlaceholder?: string;
  onSubmit?: (payload: {
    name: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; error?: string } | void> | void;
  onSecondary?: () => void;
  onSuccess?: () => void;
  showSecondary?: boolean;
};

export default function PasswordResetForm({
  defaultName,
  defaultEmail,
  kicker = "Reset password",
  heading = "Reset your password",
  subheading = "Confirm your details and set a new password to secure your StackTrack account.",
  submitLabel = "Save and continue",
  secondaryLabel = "Cancel",
  requireCurrent = false,
  currentPasswordLabel = "Current password",
  currentPasswordPlaceholder = "Enter your current password",
  onSubmit,
  onSecondary,
  onSuccess,
  showSecondary = false,
}: PasswordResetFormProps) {
  const { user } = useAuth() || { user: null };
  const [name, setName] = useState(defaultName || user?.name || "");
  const [email, setEmail] = useState(defaultEmail || user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requireCurrent && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in the new password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit?.({
        name,
        email,
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result && typeof result === "object" && "success" in result && !result.success) {
        setError(result.error || "Unable to update password.");
        return;
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{kicker}</p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{heading}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{subheading}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled
            />
          </div>
        </div>
        {requireCurrent ? (
          <div className="space-y-2">
            <Label>{currentPasswordLabel}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={currentPasswordPlaceholder}
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>New password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Create a strong password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Confirm password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
          />
        </div>
        {error ? (
          <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 dark:border-error-500/50 dark:bg-error-900/30 dark:text-error-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button size="sm" type="submit" disabled={loading}>
            {loading ? "Saving..." : submitLabel}
          </Button>
          {showSecondary ? (
            <Button size="sm" variant="outline" type="button" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
