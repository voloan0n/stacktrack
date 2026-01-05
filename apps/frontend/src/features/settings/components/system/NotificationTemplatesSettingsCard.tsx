"use client";

import React, { useEffect, useMemo, useState } from "react";
import CardHeader from "@/shared/components/common/CardHeader";
import Button from "@/shared/components/ui/button/Button";
import Form from "@/shared/components/form/Form";
import Label from "@/shared/components/form/Label";
import Select from "@/shared/components/form/Select";
import Input from "@/shared/components/form/input/InputField";
import TextArea from "@/shared/components/form/input/TextArea";
import NotificationTimelineEntry from "@/shared/components/common/NotificationTimelineEntry";

type TemplateType =
  | "ticket.created"
  | "ticket.assigned"
  | "ticket.status.updated"
  | "ticket.note.created";

type TemplateVariant = "short" | "long";

type NotificationTemplate = {
  id: string;
  type: TemplateType;
  variant: TemplateVariant;
  titleTemplate: string;
  bodyTemplate: string;
  updatedAt: string;
};

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: "ticket.created", label: "Ticket Created", description: "New ticket created." },
  { value: "ticket.assigned", label: "Ticket Assigned", description: "User assigned to ticket." },
  { value: "ticket.status.updated", label: "Ticket Status Updated", description: "Ticket status changed." },
  { value: "ticket.note.created", label: "New Note Added", description: "New note added to a ticket." },
];

const PLACEHOLDERS = [
  "ticketNumber",
  "ticketSubject",
  "requesterName",
  "authorName",
  "oldStatus",
  "newStatus",
  "notePreview",
] as const;

export default function NotificationTemplatesSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<TemplateType>("ticket.created");
  const selectedVariant: TemplateVariant = "short";

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.type === selectedType && t.variant === selectedVariant) || null,
    [templates, selectedType]
  );

  const [draft, setDraft] = useState({
    titleTemplate: "",
    bodyTemplate: "",
  });

  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/notification-templates", { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Unable to load notification templates.");
      const next = (json?.templates || []) as NotificationTemplate[];
      setTemplates(next);
      return next;
    } catch (err: any) {
      setError(err.message || "Unable to load notification templates.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setMessage(null);
    setWarnings([]);
    setError(null);
    if (!selectedTemplate) {
      setDraft({ titleTemplate: "", bodyTemplate: "" });
      return;
    }
    setDraft({
      titleTemplate: selectedTemplate.titleTemplate || "",
      bodyTemplate: selectedTemplate.bodyTemplate || "",
    });
  }, [selectedTemplate?.id]);

  useEffect(() => {
    let timer: any = null;
    const doPreview = async () => {
      setPreviewLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/proxy/admin/notification-templates/preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedType,
            variant: selectedVariant,
            titleTemplate: draft.titleTemplate,
            bodyTemplate: draft.bodyTemplate,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Unable to render preview.");
        setWarnings(Array.isArray(json?.warnings) ? json.warnings : []);
        setPreview(json?.rendered ? { title: json.rendered.title, body: json.rendered.body } : null);
      } catch (err: any) {
        setPreview(null);
        setError(err.message || "Unable to render preview.");
      } finally {
        setPreviewLoading(false);
      }
    };

    timer = setTimeout(doPreview, 250);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedType, draft.titleTemplate, draft.bodyTemplate]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/proxy/admin/notification-templates", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          variant: selectedVariant,
          titleTemplate: draft.titleTemplate,
          bodyTemplate: draft.bodyTemplate,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Unable to save template.");
      setWarnings(Array.isArray(json?.warnings) ? json.warnings : []);
      setMessage("Saved.");
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || "Unable to save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/proxy/admin/notification-templates/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, variant: selectedVariant }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Unable to reset template.");
      setMessage("Reset to default.");
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || "Unable to reset template.");
    } finally {
      setResetting(false);
    }
  };

  const selectedMeta = TEMPLATE_OPTIONS.find((t) => t.value === selectedType);
  const previewEntry = preview
    ? {
        id: "preview",
        title: preview.title || "(empty title)",
        body: preview.body || "",
        createdAt: new Date().toISOString(),
        actor: { id: "actor", name: "John Admin", accentColor: "primary" },
        entityType: "ticket",
        entityId: null,
        ticketNumber: 123,
      }
    : null;

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
    <div className="overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-lg shadow-brand-900/5">
      <CardHeader
        eyebrow="Notifications"
        title="Notification Templates"
        description="Edit server-rendered notification copy and preview changes before saving."
        variant="neutral"
      />

      <div className="space-y-6 p-5">
        {error ? (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800 dark:border-error-500/50 dark:bg-error-900/30 dark:text-error-200">
            {error}
          </div>
        ) : null}

        {warnings.length ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/40 dark:bg-brand-900/20 dark:text-brand-100">
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-app bg-app px-4 py-3 text-sm text-app">
            {message}
          </div>
        ) : null}

        <div className="rounded-2xl border border-app bg-app p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-app">{selectedMeta?.label || selectedType}</p>
              <p className="mt-1 text-xs text-app-muted">{selectedMeta?.description}</p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-divider bg-app px-4 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-app-muted">
              Preview
            </p>
            {previewLoading ? (
              <p className="text-sm text-app-muted">Rendering…</p>
            ) : previewEntry && preview ? (
              <div className="mx-auto w-full max-w-[520px]">
                <div className="rounded-lg border border-divider bg-app p-3">
                  <NotificationTimelineEntry notification={previewEntry as any} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-app-muted">Update the fields to see a preview.</p>
            )}
          </div>

          <Form
            onSubmit={() => {
              void handleSave();
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label>Template Type</Label>
              <Select
                options={TEMPLATE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                value={selectedType}
                onChange={(value) => setSelectedType(value as TemplateType)}
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Title Template</Label>
              <Input
                value={draft.titleTemplate}
                onChange={(e) => setDraft((p) => ({ ...p, titleTemplate: e.target.value }))}
                placeholder="e.g. Ticket status updated"
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Body Template</Label>
              <TextArea
                rows={4}
                value={draft.bodyTemplate}
                onChange={(value) => setDraft((p) => ({ ...p, bodyTemplate: value }))}
                placeholder="e.g. Ticket {{ticketNumber}} changed from {{oldStatus}} to {{newStatus}}."
              />
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-app-muted">
                Placeholders
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLACEHOLDERS.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-app bg-app-subtle px-2.5 py-1 text-[11px] font-mono text-app"
                  >
                    {`{{${p}}}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? "Resetting…" : "Reset to Default"}
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Template"}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
