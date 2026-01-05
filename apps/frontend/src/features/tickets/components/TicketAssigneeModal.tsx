import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/ui/modal";
import Button from "@/shared/components/ui/button/Button";
import Label from "@/shared/components/form/Label";
import Select from "@/shared/components/form/Select";
import { fetchAssignableUsers, AssignableUser } from "@/features/tickets/services/assignableUsers";

type Mode = "add" | "transfer";

type TicketAssigneeModalProps = {
  isOpen: boolean;
  mode: Mode;
  ticketTitle?: string;
  onClose: () => void;
  onConfirm: (user: AssignableUser) => Promise<void>;
};

export default function TicketAssigneeModal({
  isOpen,
  mode,
  ticketTitle,
  onClose,
  onConfirm,
}: TicketAssigneeModalProps) {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelected("");
    setSaving(false);

    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchAssignableUsers();
        setUsers(data);
      } catch (err: any) {
        console.error("Failed to load users", err);
        setError(err?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen]);

  const options = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.name}${u.isAdmin ? " • Admin" : ""} (${u.email})`,
      })),
    [users]
  );

  const title = mode === "transfer" ? "Transfer ticket" : "Add assignee";
  const description =
    mode === "transfer"
      ? "Move this ticket to another teammate. The current assignee will be replaced."
      : "Add an assignee to take ownership of this ticket.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Please choose a user");
      return;
    }
    const chosen = users.find((u) => u.id === selected);
    if (!chosen) {
      setError("Please choose a user");
      return;
    }

    try {
      setSaving(true);
      await onConfirm(chosen);
      onClose();
    } catch (err: any) {
      console.error("Assign/transfer failed", err);
      setError(err?.message || "Unable to update assignee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] m-4">
      <div className="relative w-full overflow-hidden rounded-3xl border border-app bg-app p-7 shadow-theme-lg">
        <div className="mb-6 space-y-2 pr-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-divider bg-app-subtle px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-app-muted shadow-theme-xs">
            {title}
          </div>
          <h4 className="text-xl font-semibold text-app">
            {ticketTitle || "Select assignee"}
          </h4>
          <p className="text-sm text-app-muted">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Assign to</Label>
            <Select
              options={options}
              value={selected}
              onChange={(val) => {
                setSelected(val);
                setError(null);
              }}
              placeholder={loading ? "Loading users..." : "Choose a teammate"}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 shadow-sm dark:border-error-500/50 dark:bg-error-900/30 dark:text-error-200">
              {error}
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : title}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
