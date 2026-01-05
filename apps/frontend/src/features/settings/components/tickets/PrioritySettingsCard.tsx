"use client";

import React, { useEffect, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import TableBodyState from "@/shared/components/table/TableBodyState";

type TicketPriorityOption = {
  id: string;
  key: string;
  label: string;
  order: number;
  active: boolean;
  isDefault: boolean;
};

export default function PrioritySettingsCard() {
  const [loading, setLoading] = useState(true);
  const [savingPriority, setSavingPriority] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [priorities, setPriorities] = useState<TicketPriorityOption[]>([]);
  const [newPriority, setNewPriority] = useState<Partial<TicketPriorityOption>>({
    key: "",
    label: "",
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
      setPriorities(data.priorities || []);
      return data;
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

  const clearPendingDelete = () => setPendingDeleteId(null);
  const requestDelete = (id: string) => {
    setError(null);
    setPendingDeleteId(id);
  };
  const hasPendingDelete = pendingDeleteId !== null;

  const resetPriorityForm = (prioritySource: TicketPriorityOption[] = priorities) =>
    setNewPriority({
      key: "",
      label: "",
      order: (prioritySource[prioritySource.length - 1]?.order ?? 0) + 1,
      active: true,
      isDefault: false,
    });

  const savePriority = async () => {
    if (!newPriority.key || !newPriority.label) {
      setError("Priority key and label are required.");
      return;
    }
    setSavingPriority(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options/priority", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newPriority.id,
          key: newPriority.key.trim(),
          label: newPriority.label.trim(),
          order:
            typeof newPriority.order === "number"
              ? newPriority.order
              : (priorities[priorities.length - 1]?.order ?? 0) + 1,
          active: newPriority.active ?? true,
          isDefault: newPriority.isDefault ?? false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to save priority option.");
      }
      const data = await loadOptions();
      clearPendingDelete();
      resetPriorityForm(data?.priorities || []);
    } catch (err: any) {
      setError(err.message || "Unable to save priority option.");
    } finally {
      setSavingPriority(false);
    }
  };

  const handleSavePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePriority();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/ticket-options/priority/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete priority option.");
      }
      await loadOptions();
    } catch (err: any) {
      setError(err.message || "Unable to delete priority option.");
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
      id="settings-priorities"
      className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5"
    >
      <CardHeader
        eyebrow="Tickets"
        title="Priorities"
        description="Controls the selectable priority values."
        variant="neutral"
      />

      <div className="space-y-6 p-5">
        <section className="overflow-hidden rounded-2xl border border-app bg-app">
          <div className="border-b border-divider bg-app-subtle px-4 py-3">
            <form
              onSubmit={handleSavePriority}
              className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <div>
                <Label className="sr-only">Key</Label>
                <Input
                  value={newPriority.key || ""}
                  onChange={(e) => setNewPriority((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="Key (e.g. high)"
                />
              </div>
              <div>
                <Label className="sr-only">Label</Label>
                <Input
                  value={newPriority.label || ""}
                  onChange={(e) => setNewPriority((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Label (e.g. High)"
                />
              </div>
              <Button type="submit" size="sm" disabled={savingPriority}>
                {savingPriority ? "Saving..." : "Save"}
              </Button>
            </form>
          </div>

          <div className="max-w-full max-h-[260px] overflow-x-auto overflow-y-auto">
            <Table className="min-w-full border-collapse">
              <TableHeader className="sticky top-0 z-10 border-b border-divider-strong bg-app-subtle">
                <TableRow>
                  <TableCell isHeader className="w-[320px] px-4 py-3 text-left whitespace-nowrap">
                    <p className="text-sm font-medium text-app">Priority</p>
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                    <p className="text-sm font-medium text-app">Actions</p>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-divider">
                <TableBodyState colSpan={2} isEmpty={priorities.length === 0} emptyText="No priorities yet." />
                {priorities.map((option) => (
                  <TableRow key={option.id} className="transition hover:bg-app-subtle">
                    <TableCell className="px-4 py-3 text-left">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium text-app">{option.label}</span>
                        <span className="block text-xs font-mono text-app-muted">{option.key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                      <ActionIconGroup
                        confirming={pendingDeleteId === option.id}
                        editing={newPriority.id === option.id}
                        onConfirmEdit={async () => {
                          await savePriority();
                        }}
                        confirmEditDisabled={savingPriority}
                        onCancelEdit={() => {
                          clearPendingDelete();
                          setError(null);
                          resetPriorityForm();
                        }}
                        onEdit={() => {
                          clearPendingDelete();
                          setError(null);
                          setNewPriority({
                            id: option.id,
                            key: option.key,
                            label: option.label,
                            order: option.order,
                            active: option.active,
                            isDefault: option.isDefault,
                          });
                        }}
                        onRequestDelete={() => requestDelete(option.id)}
                        onConfirm={async () => {
                          clearPendingDelete();
                          await handleDelete(option.id);
                        }}
                        onCancel={clearPendingDelete}
                        disabled={savingPriority}
                        editDisabled={deletingId === option.id || hasPendingDelete}
                        deleteDisabled={deletingId === option.id || hasPendingDelete}
                        confirmDisabled={deletingId === option.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {error ? (
        <div className="mx-5 mb-5 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800 dark:border-error-500/40 dark:bg-error-900/30 dark:text-error-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
