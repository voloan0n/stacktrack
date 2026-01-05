"use client";

import React, { useEffect, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import TableBodyState from "@/shared/components/table/TableBodyState";

type TicketStatusOption = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  nextActionDueHours?: number | null;
  order: number;
  active: boolean;
  isDefault: boolean;
};

export default function StatusSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<TicketStatusOption[]>([]);
  const [draft, setDraft] = useState<Partial<TicketStatusOption>>({
    key: "",
    label: "",
    nextActionDueHours: null,
    order: 1,
    active: true,
    isDefault: false,
  });

  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options", { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load ticket options.");
      const data = await res.json();
      const nextStatuses: TicketStatusOption[] = data.statuses || [];
      setStatuses(nextStatuses);
      setDraft((prev) => ({
        ...prev,
        order: (nextStatuses[nextStatuses.length - 1]?.order ?? 0) + 1,
      }));
      return nextStatuses;
    } catch (err: any) {
      setError(err.message || "Unable to load ticket options.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const resetForm = (statusSource: TicketStatusOption[] = statuses) =>
    setDraft({
      key: "",
      label: "",
      nextActionDueHours: null,
      order: (statusSource[statusSource.length - 1]?.order ?? 0) + 1,
      active: true,
      isDefault: false,
    });

  const saveDraft = async () => {
    if (!draft.key || !draft.label) {
      setError("Status key and label are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options/status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          key: draft.key.trim(),
          label: draft.label.trim(),
          description: null,
          nextActionDueHours:
            typeof draft.nextActionDueHours === "number" ? draft.nextActionDueHours : null,
          order: typeof draft.order === "number" ? draft.order : (statuses[statuses.length - 1]?.order ?? 0) + 1,
          active: draft.active ?? true,
          isDefault: draft.isDefault ?? false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to save status option.");
      }
      const next = await loadOptions();
      setPendingDeleteId(null);
      resetForm(next || []);
    } catch (err: any) {
      setError(err.message || "Unable to save status option.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDraft();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/ticket-options/status/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete status option.");
      }
      await loadOptions();
    } catch (err: any) {
      setError(err.message || "Unable to delete status option.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-app bg-app-subtle p-6 shadow-lg shadow-brand-900/5">
        <div className="h-4 w-1/3 animate-pulse rounded bg-app-subtle" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-app-subtle" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-app-subtle" />
        </div>
      </div>
    );
  }

  return (
    <div
      id="settings-statuses"
      className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5"
    >
      <CardHeader
        eyebrow="Tickets"
        title="Status Types"
        description='Edit status values and configure the "next action due" deadline in business hours.'
        variant="neutral"
      />

      <div className="space-y-8 p-5">
        {error ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800 dark:border-error-500/50 dark:bg-error-900/30 dark:text-error-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-app bg-app p-4 sm:p-5">
            <CardHeader size="sm" eyebrow="Status" title={draft.id ? "Edit status" : "Add status"} className="mb-4" />
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Key</Label>
                  <Input
                    value={draft.key || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g. new, in_progress"
                  />
                </div>
                <div>
                  <Label>Label</Label>
                  <Input
                    value={draft.label || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. New"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <Label>Next Action Due (hours)</Label>
                  <Input
                    value={draft.nextActionDueHours ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        nextActionDueHours: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    placeholder="e.g. 4"
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2 sm:mt-0">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : draft.id ? "Update Status" : "Add Status"}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-2xl border border-app bg-app">
            <div className="border-b border-divider bg-app-subtle px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-app-muted">Current Status Types</p>
            </div>
            <div className="max-w-full max-h-[260px] overflow-x-auto overflow-y-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader className="sticky top-0 z-10 border-b border-divider-strong bg-app-subtle">
                  <TableRow>
                    <TableCell isHeader className="w-[260px] px-4 py-3 text-left whitespace-nowrap">
                      <p className="text-sm font-medium text-app">Status</p>
                    </TableCell>
                    <TableCell isHeader className="w-[160px] px-4 py-3 text-left whitespace-nowrap">
                      <p className="text-sm font-medium text-app">Next action</p>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                      <p className="text-sm font-medium text-app">Actions</p>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-divider">
                  <TableBodyState colSpan={3} isEmpty={statuses.length === 0} emptyText="No status types yet." />
                  {statuses.map((option) => (
                    <TableRow key={option.id} className="transition hover:bg-app-subtle">
                      <TableCell className="px-4 py-3 text-left">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium text-app">{option.label}</span>
                          <span className="block text-xs font-mono text-app-muted">{option.key}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-left">
                        <span className="text-sm text-app">
                          {typeof option.nextActionDueHours === "number" ? `${option.nextActionDueHours}h` : "—"}
                        </span>
                      </TableCell>
                        <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                          <ActionIconGroup
                            confirming={pendingDeleteId === option.id}
                            editing={draft.id === option.id}
                            onConfirmEdit={async () => {
                              await saveDraft();
                            }}
                            confirmEditDisabled={saving}
                            onCancelEdit={() => {
                              setPendingDeleteId(null);
                              setError(null);
                              resetForm();
                            }}
                            onEdit={() => {
                              setPendingDeleteId(null);
                              setError(null);
                              setDraft({
                                id: option.id,
                                key: option.key,
                                label: option.label,
                                nextActionDueHours: option.nextActionDueHours ?? null,
                                order: option.order,
                                active: option.active,
                                isDefault: option.isDefault,
                              });
                            }}
                            onRequestDelete={() => {
                              setError(null);
                              setPendingDeleteId(option.id);
                            }}
                            onConfirm={async () => {
                              setPendingDeleteId(null);
                              await handleDelete(option.id);
                            }}
                            onCancel={() => setPendingDeleteId(null)}
                            disabled={saving}
                            editDisabled={pendingDeleteId !== null}
                            deleteDisabled={deletingId === option.id || pendingDeleteId !== null}
                            confirmDisabled={deletingId === option.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
