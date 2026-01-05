"use client";

import { useAuth } from "@/features/auth/lib/provider";
import Button from "@/shared/components/ui/button/Button";
import Label from "@/shared/components/form/Label";
import CardHeader from "@/shared/components/common/CardHeader";
import React, { useEffect, useState } from "react";

export default function NotificationSettingsCard() {
  const { user, setUser } = useAuth() || { user: null, setUser: () => {} };
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(user?.notificationPreferences?.enabled ?? true);
  const [onTicketCreated, setOnTicketCreated] = useState<boolean>(
    user?.notificationPreferences?.onTicketCreated ?? true
  );
  const [onTicketAssigned, setOnTicketAssigned] = useState<boolean>(
    user?.notificationPreferences?.onTicketAssigned ?? true
  );
  const [onStatusUpdate, setOnStatusUpdate] = useState<boolean>(
    user?.notificationPreferences?.onStatusUpdate ?? true
  );
  const [onInternalNote, setOnInternalNote] = useState<boolean>(
    user?.notificationPreferences?.onInternalNote ?? true
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser?.((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        notificationsEnabled: enabled,
        notificationPreferences: {
          ...(prev.notificationPreferences || {}),
          enabled,
          onTicketCreated,
          onTicketAssigned,
          onStatusUpdate,
          onInternalNote,
        },
      };
    });
  }, [enabled, onInternalNote, onStatusUpdate, onTicketAssigned, onTicketCreated, setUser]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      enabled,
      onTicketCreated,
      onTicketAssigned,
      onStatusUpdate,
      onInternalNote,
    };

    try {
      const res = await fetch("/api/proxy/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update notifications");

      setUser?.((prev: any) => ({
        ...(prev || {}),
        notificationsEnabled: Boolean(json?.notificationsEnabled ?? enabled),
        notificationPreferences: json?.notificationPreferences ?? payload,
      }));
      setMessage("Notification preferences updated");
    } catch (err: any) {
      setMessage(err?.message || "Failed to update notifications");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-sm">
      {/* ========================================================= */}
      {/*                      HEADER SECTION                       */}
      {/* ========================================================= */}
      <CardHeader
        eyebrow="Notifications"
        title="Stay up to date"
        description="Control whether you see ticket alerts in the header and which events notify you."
      />

      {/* ========================================================= */}
      {/*                         CONTENT                           */}
      {/* ========================================================= */}
      <div className="space-y-5 px-5 py-6 lg:px-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-app bg-app px-4 py-3">
          <div>
            <Label>Enable notifications</Label>
            <p className="text-sm text-app-muted">
              Turn off to hide the notification bell entirely.
            </p>
          </div>
          <ToggleSwitch checked={enabled} onChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleRow
            label="New ticket created"
            description="Alerts when a new ticket is created."
            checked={enabled && onTicketCreated}
            disabled={!enabled}
            onChange={setOnTicketCreated}
          />
          <ToggleRow
            label="Assigned to a ticket"
            description="Alerts when you are assigned to a ticket."
            checked={enabled && onTicketAssigned}
            disabled={!enabled}
            onChange={setOnTicketAssigned}
          />
          <ToggleRow
            label="Status updates"
            description="Changes to status on tickets assigned to you."
            checked={enabled && onStatusUpdate}
            disabled={!enabled}
            onChange={setOnStatusUpdate}
          />
          <ToggleRow
            label="Notes"
            description="New notes on tickets assigned to you."
            checked={enabled && onInternalNote}
            disabled={!enabled}
            onChange={setOnInternalNote}
          />
        </div>

        {message && (
          <div className="rounded-xl border border-app bg-app px-4 py-3 text-sm text-app">
            {message}
          </div>
        )}

        <div className="flex items-center justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-app bg-app px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-app">{label}</p>
        <p className="mt-0.5 text-xs text-app-muted">{description}</p>
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-brand-500" : "bg-app-subtle"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
