"use client";

import React, { useEffect, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import ActionIconGroup from "@/shared/components/common/ActionIconGroup";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/shared/components/ui/table";
import TableBodyState from "@/shared/components/table/TableBodyState";

type TicketCategoryOption = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  order: number;
  active: boolean;
  isDefault: boolean;
};

export default function CategorySettingsCard() {
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<TicketCategoryOption[]>([]);
  const [newCategory, setNewCategory] = useState<Partial<TicketCategoryOption>>({
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
      setCategories(data.types || []);
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

  const resetCategoryForm = (categorySource: TicketCategoryOption[] = categories) =>
    setNewCategory({
      key: "",
      label: "",
      order: (categorySource[categorySource.length - 1]?.order ?? 0) + 1,
      active: true,
      isDefault: false,
    });

  const saveCategory = async () => {
    if (!newCategory.key || !newCategory.label) {
      setError("Category key and label are required.");
      return;
    }
    setSavingCategory(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options/type", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newCategory.id,
          key: newCategory.key.trim(),
          label: newCategory.label.trim(),
          description: null,
          order:
            typeof newCategory.order === "number"
              ? newCategory.order
              : (categories[categories.length - 1]?.order ?? 0) + 1,
          active: newCategory.active ?? true,
          isDefault: newCategory.isDefault ?? false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to save category option.");
      }
      const data = await loadOptions();
      clearPendingDelete();
      resetCategoryForm(data?.types || []);
    } catch (err: any) {
      setError(err.message || "Unable to save category option.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCategory();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/ticket-options/type/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Unable to delete category option.");
      }
      await loadOptions();
    } catch (err: any) {
      setError(err.message || "Unable to delete category option.");
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
      id="settings-categories"
      className="scroll-mt-[96px] overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5"
    >
      <CardHeader
        eyebrow="Tickets"
        title="Categories"
        description="Controls the selectable ticket category values."
        variant="neutral"
      />

      <div className="space-y-6 p-5">
        <section className="overflow-hidden rounded-2xl border border-app bg-app">
          <div className="border-b border-divider bg-app-subtle px-4 py-3">
            <form
              onSubmit={handleSaveCategory}
              className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <div>
                <Label className="sr-only">Key</Label>
                <Input
                  value={newCategory.key || ""}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="Key (e.g. support)"
                />
              </div>
              <div>
                <Label className="sr-only">Label</Label>
                <Input
                  value={newCategory.label || ""}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Label (e.g. Support)"
                />
              </div>
              <Button type="submit" size="sm" disabled={savingCategory}>
                {savingCategory ? "Saving..." : "Save"}
              </Button>
            </form>
          </div>

          <div className="max-w-full max-h-[260px] overflow-x-auto overflow-y-auto">
            <Table className="min-w-full border-collapse">
              <TableHeader className="sticky top-0 z-10 border-b border-divider-strong bg-app-subtle">
                <TableRow>
                  <TableCell isHeader className="w-[320px] px-4 py-3 text-left whitespace-nowrap">
                    <p className="text-sm font-medium text-app">Category</p>
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-center whitespace-nowrap">
                    <p className="text-sm font-medium text-app">Actions</p>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-divider">
                <TableBodyState colSpan={2} isEmpty={categories.length === 0} emptyText="No categories yet." />
                {categories.map((option) => (
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
                        editing={newCategory.id === option.id}
                        onConfirmEdit={async () => {
                          await saveCategory();
                        }}
                        confirmEditDisabled={savingCategory}
                        onCancelEdit={() => {
                          clearPendingDelete();
                          setError(null);
                          resetCategoryForm();
                        }}
                        onEdit={() => {
                          clearPendingDelete();
                          setError(null);
                          setNewCategory({
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
                        disabled={savingCategory}
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
