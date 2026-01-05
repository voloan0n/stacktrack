"use client";

import React, { useEffect, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import TableBodyState from "@/shared/components/table/TableBodyState";

type TicketBillingTypeOption = {
  id: string;
  key: string;
  label: string;
  order: number;
  active: boolean;
  isDefault: boolean;
};

export default function BillingTypesSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [savingBillingType, setSavingBillingType] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [billingTypes, setBillingTypes] = useState<TicketBillingTypeOption[]>([]);
  const [newBillingType, setNewBillingType] = useState<Partial<TicketBillingTypeOption>>({
    key: "",
    label: "",
    order: (billingTypes[billingTypes.length - 1]?.order ?? 0) + 1,
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
      setBillingTypes(data.billingTypes || []);
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

  const isPendingDelete = (kind: string, id: string) => pendingDelete?.kind === kind && pendingDelete?.id === id;
  const clearPendingDelete = () => setPendingDelete(null);
  const requestDelete = (kind: string, id: string) => {
    setError(null);
    setPendingDelete({ kind, id });
  };
  const hasPendingDelete = pendingDelete !== null;

  const resetBillingTypeForm = (billingTypeSource: TicketBillingTypeOption[] = billingTypes) =>
    setNewBillingType({
      key: "",
      label: "",
      order: (billingTypeSource[billingTypeSource.length - 1]?.order ?? 0) + 1,
      active: true,
      isDefault: false,
    });

  const saveBillingType = async () => {
    if (!newBillingType.key || !newBillingType.label) {
      setError("Billing type key and label are required.");
      return;
    }
    setSavingBillingType(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options/billing-type", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newBillingType.id,
          key: newBillingType.key.trim(),
          label: newBillingType.label.trim(),
          order:
            typeof newBillingType.order === "number"
              ? newBillingType.order
              : (billingTypes[billingTypes.length - 1]?.order ?? 0) + 1,
          active: newBillingType.active ?? true,
          isDefault: newBillingType.isDefault ?? false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to save billing type option.");
      }
      const data = await loadOptions();
      clearPendingDelete();
      resetBillingTypeForm(data?.billingTypes || []);
    } catch (err: any) {
      setError(err.message || "Unable to save billing type option.");
    } finally {
      setSavingBillingType(false);
    }
  };

  const handleSaveBillingType = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveBillingType();
  };

  const handleDeleteBillingType = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/ticket-options/billing-type/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete billing type option.");
      }
      await loadOptions();
    } catch (err: any) {
      setError(err.message || "Unable to delete billing type option.");
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
      id="settings-billing-types"
      className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5"
    >
      <CardHeader
        eyebrow="Billing"
        title="Billing Types"
        description="Controls the selectable billing values when adding ticket notes."
        variant="neutral"
      />

      <div className="space-y-8 p-5">
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-app bg-app">
            <div className="border-b border-divider bg-app-subtle px-4 py-3">
              <form
                onSubmit={handleSaveBillingType}
                className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <div>
                  <Label className="sr-only">Key</Label>
                  <Input
                    value={newBillingType.key || ""}
                    onChange={(e) => setNewBillingType((prev) => ({ ...prev, key: e.target.value }))}
                    placeholder="Key (e.g. billable)"
                  />
                </div>
                <div>
                  <Label className="sr-only">Label</Label>
                  <Input
                    value={newBillingType.label || ""}
                    onChange={(e) => setNewBillingType((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="Label (e.g. Billable)"
                  />
                </div>
                <Button type="submit" size="sm" disabled={savingBillingType}>
                  {savingBillingType ? "Saving..." : "Save"}
                </Button>
              </form>
            </div>

            <div className="max-w-full max-h-[260px] overflow-x-auto overflow-y-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader className="sticky top-0 z-10 border-b border-divider-strong bg-app-subtle">
                  <TableRow>
                    <TableCell isHeader className="w-[320px] px-4 py-3 text-left whitespace-nowrap">
                      <p className="text-sm font-medium text-app">Billing type</p>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                      <p className="text-sm font-medium text-app">Actions</p>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-divider">
                  <TableBodyState colSpan={2} isEmpty={billingTypes.length === 0} emptyText="No billing types yet." />
                  {billingTypes.map((option) => (
                    <TableRow key={option.id} className="transition hover:bg-app-subtle">
                      <TableCell className="px-4 py-3 text-left">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium text-app">{option.label}</span>
                          <span className="block text-xs font-mono text-app-muted">{option.key}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                        <ActionIconGroup
                          confirming={isPendingDelete("billingType", option.id)}
                          editing={newBillingType.id === option.id}
                          onConfirmEdit={async () => {
                            await saveBillingType();
                          }}
                          confirmEditDisabled={savingBillingType}
                          onCancelEdit={() => {
                            clearPendingDelete();
                            setError(null);
                            resetBillingTypeForm();
                          }}
                          onEdit={() => {
                            clearPendingDelete();
                            setError(null);
                            setNewBillingType({
                              id: option.id,
                              key: option.key,
                              label: option.label,
                              order: option.order,
                              active: option.active,
                              isDefault: option.isDefault,
                            });
                          }}
                          onRequestDelete={() => requestDelete("billingType", option.id)}
                          onConfirm={async () => {
                            clearPendingDelete();
                            await handleDeleteBillingType(option.id);
                          }}
                          onCancel={clearPendingDelete}
                          disabled={savingBillingType}
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
