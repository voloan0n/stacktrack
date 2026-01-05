"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/ui/modal";
import CardHeader from "@/shared/components/common/CardHeader";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import TextArea from "@/shared/components/form/input/TextArea";
import Label from "@/shared/components/form/Label";
import Select from "@/shared/components/form/Select";
import { createClient } from "@/features/clients/hooks/useUpdateClient";
import { normalizePhone } from "@/shared/utils/phone";
import PhoneInput from "@/shared/components/form/group-input/PhoneInput";
import { EnvelopeIcon } from "@/shared/icons";
import useTicketOptions from "@/features/tickets/hooks/useTicketOptions";
import { fetchTicketDetail } from "@/features/tickets/services/api";
import { getDefaultTicketOptionKey } from "@/features/tickets/utils/options";
import { updateClient } from "@/features/clients/hooks/useUpdateClient";

type TicketForm = {
  id?: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddressCity?: string;
  clientAddressState?: string;
  title: string;
  detail: string;
  priority: string;
  status: string;
  type: string;
  internalOnly?: boolean;
};

type ClientSnapshot = {
  id: string;
  name: string;
  email: string;
  phone: string;
  addressCity: string;
  addressState: string;
  country: string;
};

type TicketSeed = Partial<TicketForm> & {
  client?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    addressCity?: string;
    addressState?: string;
    company?: { name?: string };
  };
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TicketForm) => Promise<void> | void;
  ticket?: TicketSeed | null;
  canAssign?: boolean;
  canUpdate?: boolean;
  canCreate?: boolean;
}

const blankForm: TicketForm = {
  id: "",
  clientId: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientCompany: "",
  clientAddressCity: "",
  clientAddressState: "",
  title: "",
  detail: "",
  priority: "",
  status: "",
  type: "",
  internalOnly: false,
};

const extractDetailText = (detail: any) => {
  if (!detail) return "";
  if (typeof detail === "string") {
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.text) return parsed.text;
    } catch (_err) {
      /* ignore JSON parse failure */
    }
    return detail;
  }
  if (typeof detail === "object") return detail.text || "";
  return "";
};

const hydrateFromTicket = (
  data: TicketSeed | undefined,
  defaults: Pick<TicketForm, "priority" | "status" | "type">
): TicketForm => {
  const isInternal = Boolean(data?.internalOnly);

  return {
    ...blankForm,
    ...(data?.id ? { id: data.id } : {}),
    clientId: isInternal ? "" : data?.clientId || data?.client?.id || "",
    clientName: isInternal ? "" : data?.clientName || data?.client?.name || "",
    clientEmail: isInternal ? "" : data?.clientEmail || data?.client?.email || "",
    clientPhone: isInternal ? "" : data?.clientPhone || data?.client?.phone || "",
    clientCompany: isInternal ? "" : data?.clientCompany || data?.client?.company?.name || "",
    clientAddressCity: isInternal
      ? ""
      : data?.clientAddressCity || data?.client?.addressCity || data?.client?.city || "",
    clientAddressState: isInternal
      ? ""
      : data?.clientAddressState || data?.client?.addressState || data?.client?.state || "",
    title: data?.title || "",
    detail: extractDetailText(data?.detail),
    priority: (data?.priority || defaults.priority || "").toLowerCase(),
    type: (data?.type || defaults.type || "").toLowerCase(),
    status: (data?.status || defaults.status || "").toLowerCase(),
    internalOnly: data?.internalOnly ?? false,
  };
};

export default function TicketForm({ isOpen, onClose, onSave, ticket, canAssign: _canAssign = true, canUpdate = true, canCreate = true }: Props) {
  const { options: ticketOptions } = useTicketOptions();
  const [form, setForm] = useState<TicketForm>(blankForm);
  const [initialForm, setInitialForm] = useState<TicketForm>(blankForm);
  const [clientMode, setClientMode] = useState<"existing" | "new" | "internal">("existing");
  const [selectedClientCountry, setSelectedClientCountry] = useState<string>("US");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [, setListsLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [clients, setClients] = useState<
    Array<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      addressCity?: string;
      addressState?: string;
      city?: string;
      state?: string;
      country?: string | null;
      company?: { name?: string };
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [clientBaseline, setClientBaseline] = useState<ClientSnapshot | null>(null);

  const defaults = useMemo(() => {
    return {
      status: getDefaultTicketOptionKey(ticketOptions.statuses || []),
      priority: getDefaultTicketOptionKey(ticketOptions.priorities || []),
      type: getDefaultTicketOptionKey(ticketOptions.types || []),
    };
  }, [ticketOptions.priorities, ticketOptions.statuses, ticketOptions.types]);

  const priorityOptions = useMemo(() => {
    return (ticketOptions.priorities || [])
      .filter((p) => p?.active !== false)
      .map((p) => ({ label: p.label, value: p.key }));
  }, [ticketOptions.priorities]);

  const typeOptions = useMemo(() => {
    return (ticketOptions.types || [])
      .filter((t) => t?.active !== false)
      .map((t) => ({ label: t.label, value: t.key }));
  }, [ticketOptions.types]);

  const isEditing = Boolean(form.id || ticket?.id);

  const formatUsPhone = (value?: string) => {
    const digits = (value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 10) {
      const area = digits.slice(0, 3);
      const prefix = digits.slice(3, 6);
      const line = digits.slice(6);
      return `(${area}) ${prefix}-${line}`;
    }
    return value || digits;
  };

  const updateField = (key: keyof TicketForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeText = (value: unknown) => String(value ?? "").trim();

  const getClientSnapshotFromForm = (id: string): ClientSnapshot => ({
    id,
    name: normalizeText(form.clientName),
    email: normalizeText(form.clientEmail),
    phone: normalizePhone(form.clientPhone) || "",
    addressCity: normalizeText(form.clientAddressCity),
    addressState: normalizeText(form.clientAddressState),
    country: normalizeText(selectedClientCountry) || "US",
  });

  const getClientSnapshotFromTicketForm = (id: string, data: TicketForm): ClientSnapshot => ({
    id,
    name: normalizeText(data.clientName),
    email: normalizeText(data.clientEmail),
    phone: normalizePhone(data.clientPhone) || "",
    addressCity: normalizeText(data.clientAddressCity),
    addressState: normalizeText(data.clientAddressState),
    country: "US",
  });

  const getClientSnapshotFromClient = (client: any): ClientSnapshot => ({
    id: String(client?.id ?? ""),
    name: normalizeText(client?.name),
    email: normalizeText(client?.email),
    phone: normalizePhone(client?.phone) || "",
    addressCity: normalizeText(client?.addressCity || client?.city),
    addressState: normalizeText(client?.addressState || client?.state),
    country: normalizeText(client?.country) || "US",
  });

  const isFormDirty = useMemo(() => {
    const a = initialForm;
    const b = form;
    if (!a) return false;
    return (
      a.id !== b.id ||
      a.clientId !== b.clientId ||
      normalizeText(a.clientName) !== normalizeText(b.clientName) ||
      normalizeText(a.clientEmail) !== normalizeText(b.clientEmail) ||
      (normalizePhone(a.clientPhone) || "") !== (normalizePhone(b.clientPhone) || "") ||
      normalizeText(a.clientCompany) !== normalizeText(b.clientCompany) ||
      normalizeText(a.clientAddressCity) !== normalizeText(b.clientAddressCity) ||
      normalizeText(a.clientAddressState) !== normalizeText(b.clientAddressState) ||
      normalizeText(a.title) !== normalizeText(b.title) ||
      normalizeText(a.detail) !== normalizeText(b.detail) ||
      a.priority !== b.priority ||
      a.status !== b.status ||
      a.type !== b.type ||
      Boolean(a.internalOnly) !== Boolean(b.internalOnly)
    );
  }, [form, initialForm]);

  const handleClientSelect = (id: string) => {
    const match = clients.find((c) => c.id === id);
    setClientMode("existing");
    updateField("clientId", id);
    if (match) {
      updateField("clientName", match.name || "");
      updateField("clientEmail", match.email || "");
      updateField("clientPhone", match.phone || "");
      updateField("clientAddressCity", match.addressCity || match.city || "");
      updateField("clientAddressState", match.addressState || match.state || "");
      setSelectedClientCountry(match.country || "US");
      setClientBaseline(getClientSnapshotFromClient(match));
    } else {
      updateField("clientAddressCity", "");
      updateField("clientAddressState", "");
      setSelectedClientCountry("US");
      setClientBaseline(null);
    }
  };

  const toggleInternalOnly = (next: boolean) => {
    updateField("internalOnly", next);
    if (next) {
      setClientMode("internal");
      setSelectedClientCountry("US");
      updateField("clientId", "");
      updateField("clientName", "");
      updateField("clientEmail", "");
      updateField("clientPhone", "");
      updateField("clientAddressCity", "");
      updateField("clientAddressState", "");
    } else {
      if (clientMode === "internal") setClientMode("existing");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setListsLoading(true);
    setError(null);
    fetch("/api/proxy/clients?limit=100")
      .then((res) => (res.ok ? res.json() : { clients: [] }))
      .then((data) => setClients(data.clients || []))
      .catch(() => setError("Unable to load reference data right now."))
      .finally(() => setListsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (clientMode === "internal") {
      setSelectedClientCountry("US");
      updateField("internalOnly", true);
      updateField("clientId", "");
      updateField("clientName", "");
      updateField("clientEmail", "");
      updateField("clientPhone", "");
      updateField("clientAddressCity", "");
      updateField("clientAddressState", "");
    } else if (clientMode === "new") {
      setSelectedClientCountry("US");
      updateField("internalOnly", false);
      updateField("clientId", "");
      updateField("clientName", "");
      updateField("clientEmail", "");
      updateField("clientPhone", "");
      updateField("clientAddressCity", "");
      updateField("clientAddressState", "");
    } else {
      updateField("internalOnly", false);
    }
  }, [clientMode, isOpen]);

  useEffect(() => {
    if (!form.clientId) {
      setSelectedClientCountry("US");
      return;
    }
    const match = clients.find((c) => c.id === form.clientId);
    setSelectedClientCountry(match?.country || "US");
  }, [clients, form.clientId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!form.clientId || form.internalOnly) {
      setClientBaseline(null);
      return;
    }
    if (clientBaseline?.id === form.clientId) return;
    const match = clients.find((c) => c.id === form.clientId);
    if (match) {
      setClientBaseline(getClientSnapshotFromClient(match));
      return;
    }
    if (form.clientName || form.clientEmail || form.clientPhone) {
      setClientBaseline(getClientSnapshotFromForm(form.clientId));
    }
  }, [clients, clientBaseline?.id, form.clientEmail, form.clientId, form.clientName, form.clientPhone, form.internalOnly, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!ticket) {
      const seeded = hydrateFromTicket(undefined, defaults);
      setForm(seeded);
      setInitialForm(seeded);
      setClientMode("existing");
      setClientBaseline(null);
      return;
    }

    const seeded = hydrateFromTicket(ticket, defaults);
    setForm(seeded);
    setInitialForm(seeded);
    if (seeded.internalOnly) setClientMode("internal");
    else if (seeded.clientId) setClientMode("existing");
    else setClientMode("new");
    setClientBaseline(
      seeded.clientId
        ? {
            id: seeded.clientId,
            name: normalizeText(seeded.clientName),
            email: normalizeText(seeded.clientEmail),
            phone: normalizePhone(seeded.clientPhone) || "",
            addressCity: normalizeText(seeded.clientAddressCity),
            addressState: normalizeText(seeded.clientAddressState),
            country: "US",
          }
        : null
    );

    if (!ticket.id) return;

    const loadDetail = async () => {
      setTicketLoading(true);
      try {
        const data = await fetchTicketDetail(String(ticket.id));
        const hydrated = hydrateFromTicket({ ...ticket, ...data.ticket, client: data.ticket?.client }, defaults);
        setForm(hydrated);
        setInitialForm(hydrated);
        if (hydrated.internalOnly) setClientMode("internal");
        else if (hydrated.clientId) setClientMode("existing");
        else setClientMode("new");
        setClientBaseline(
          hydrated.clientId
            ? {
                id: hydrated.clientId,
                name: normalizeText(hydrated.clientName),
                email: normalizeText(hydrated.clientEmail),
                phone: normalizePhone(hydrated.clientPhone) || "",
                addressCity: normalizeText(hydrated.clientAddressCity),
                addressState: normalizeText(hydrated.clientAddressState),
                country: "US",
              }
            : null
        );
      } catch (err) {
        console.error("❌ Failed to load ticket detail:", err);
        setError("Unable to load ticket details right now.");
      } finally {
        setTicketLoading(false);
      }
    };

    loadDetail();
  }, [ticket, isOpen, defaults]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.detail.trim()) {
      setError("Title and notes are required.");
      return;
    }
    if (!isFormDirty) return;
    const hasExistingClient = Boolean((form.clientId || "").trim());
    const hasNewClientInfo = Boolean(
      form.clientName.trim() ||
        form.clientEmail.trim() ||
        form.clientPhone?.trim() ||
        form.clientAddressCity?.trim() ||
        form.clientAddressState?.trim()
    );
    if (!form.internalOnly && !hasExistingClient && !(clientMode === "new" && hasNewClientInfo)) {
      setError("Select a client or mark this ticket as Internal.");
      return;
    }

    setLoading(true);
    setSaveStatus("idle");
    setError(null);
    try {
      let clientId = form.clientId || "";
      const { clientAddressCity, clientAddressState, ...ticketForm } = form;

      if (!form.internalOnly && clientId) {
        const baseline = clientBaseline ?? (initialForm ? getClientSnapshotFromTicketForm(clientId, initialForm) : null);
        const current = getClientSnapshotFromForm(clientId);
        const hasClientChanges =
          baseline !== null &&
          (baseline.name !== current.name ||
            baseline.email !== current.email ||
            baseline.phone !== current.phone ||
            baseline.addressCity !== current.addressCity ||
            baseline.addressState !== current.addressState ||
            baseline.country !== current.country);

        if (hasClientChanges) {
          await updateClient(clientId, {
            name: current.name || "Client",
            email: current.email || null,
            phone: current.phone || null,
            addressCity: current.addressCity || null,
            addressState: current.addressState || null,
            country: current.country || "US",
          });

          setClientBaseline(current);
          setClients((prev) =>
            prev.map((c) =>
              c.id !== clientId
                ? c
                : {
                    ...c,
                    name: current.name,
                    email: current.email || undefined,
                    phone: current.phone || undefined,
                    addressCity: current.addressCity || undefined,
                    addressState: current.addressState || undefined,
                    country: current.country,
                  }
            )
          );
        }
      }

      if (
        !clientId &&
        !form.internalOnly &&
        clientMode === "new" &&
        (form.clientName.trim() ||
          form.clientEmail.trim() ||
          form.clientPhone?.trim())
      ) {
        try {
          const created = await createClient({
            name: form.clientName || "New Client",
            email: form.clientEmail || null,
            phone: normalizePhone(form.clientPhone),
            addressCity: clientAddressCity || null,
            addressState: clientAddressState || null,
            type: "individual",
          });
          clientId = created.id;
          setForm((prev) => ({ ...prev, clientId: created.id }));
          setClientMode("existing");
          setClientBaseline(getClientSnapshotFromClient(created));

          // Client schema no longer stores companyName; skip any follow-up update.
        } catch (err) {
          console.warn("Skipping client save; continuing ticket save.", err);
        }
      }

      await onSave({
        ...ticketForm,
        id: form.id || ticket?.id,
        clientId: clientId || undefined,
        internalOnly: form.internalOnly,
      });
      setSaveStatus("success");
      setInitialForm((prev) => ({ ...(prev || blankForm), ...form, clientId: clientId || "" }));
    } catch (err) {
      console.error("Failed to save ticket", err);
      setError("Could not save ticket. Please try again.");
      setSaveStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl m-4">
      <div className="overflow-hidden rounded-3xl border border-app bg-app shadow-theme-lg">
        <CardHeader
          eyebrow="Ticket"
          title={isEditing ? "Update Ticket" : "Create Ticket"}
          description="Keep the summary tight and add enough notes for a quick handoff."
          size="md"
        />

        <div className="grid gap-6 p-6 lg:grid-cols-2">

          {/* Ticket Details Card */}
          <div className="rounded-2xl border border-app bg-app p-5 shadow-theme-xs">

            {/* Header */}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                Ticket Details
              </p>
              <h4 className="text-sm font-semibold text-app">
                Summary & notes
              </h4>
            </div>

            {/* Body */}
            <div className="mt-4 space-y-4">

              {/* Title */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Short summary"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description *</Label>
                <TextArea
                  rows={2}
                  value={form.detail}
                  onChange={(value) => updateField("detail", value)}
                  placeholder="Describe the issue, impact, and any steps already taken."
                  className="text-app placeholder:text-app-muted"
                />
              </div>

              {/* Four fields nicely aligned */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    options={typeOptions}
                    value={form.type}
                    onChange={(value) => updateField("type", value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    options={priorityOptions}
                    value={form.priority}
                    onChange={(value) => updateField("priority", value)}
                  />
                </div>



              </div>
            </div>
          </div>

          {/* Client Info Card */}
          <div className="rounded-2xl border border-app bg-app p-5 shadow-theme-xs">

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  Client
                </p>
                <h4 className="text-sm font-semibold text-app">
                  Link or create
                </h4>
              </div>

              <label className="flex shrink-0 items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  Internal
                </span>
                <input
                  type="checkbox"
                  checked={!!form.internalOnly}
                  onChange={(e) => toggleInternalOnly(e.target.checked)}
                  className="h-4 w-4 rounded border border-app bg-app accent-[var(--color-primary)]"
                />
              </label>
            </div>

            {/* Body */}
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Existing client</Label>
                <Select
                  placeholder="Select from existing clients"
                  options={clients.map((c) => ({
                    label: c.name || c.email || c.id,
                    value: c.id,
                  }))}
                  value={form.clientId || ""}
                  onChange={(value) => {
                    setClientMode("existing");
                    updateField("internalOnly", false);
                    handleClientSelect(value);
                  }}
                  disabled={!!form.internalOnly}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 border-t border-divider" />
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  or
                </p>
                <div className="h-px flex-1 border-t border-divider" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client name</Label>
                    <Input
                      value={form.clientName}
                      onChange={(e) => {
                        if (!form.clientId) setClientMode("new");
                        updateField("internalOnly", false);
                        if (!form.clientId) updateField("clientId", "");
                        updateField("clientName", e.target.value);
                      }}
                      placeholder="Acme Inc."
                      disabled={!!form.internalOnly}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div
                      className={!!form.internalOnly ? "pointer-events-none opacity-60" : ""}
                      aria-disabled={!!form.internalOnly}
                    >
                      <PhoneInput
                        country={selectedClientCountry}
                        placeholder="(555) 555-5555"
                        value={formatUsPhone(form.clientPhone)}
                        onChange={(value) => {
                          if (form.internalOnly) return;
                          if (!form.clientId) setClientMode("new");
                          updateField("internalOnly", false);
                          if (!form.clientId) updateField("clientId", "");
                          updateField("clientPhone", normalizePhone(value) || "");
                        }}
                        disabled={!!form.internalOnly}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={form.clientEmail}
                        onChange={(e) => {
                          if (!form.clientId) setClientMode("new");
                          updateField("internalOnly", false);
                          if (!form.clientId) updateField("clientId", "");
                          updateField("clientEmail", e.target.value);
                        }}
                        className="pl-12"
                        placeholder="name@company.com"
                        disabled={!!form.internalOnly}
                      />
                      <span className="absolute inset-y-0 left-0 flex h-full items-center border-r border-divider px-3 text-app-muted">
                        <span className="flex h-5 w-5 items-center justify-center">
                          <EnvelopeIcon className="h-4 w-4 shrink-0" />
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>City</Label>
                    <Input
                      value={form.clientAddressCity || ""}
                      onChange={(e) => {
                        if (!form.clientId) setClientMode("new");
                        updateField("internalOnly", false);
                        if (!form.clientId) updateField("clientId", "");
                        updateField("clientAddressCity", e.target.value);
                      }}
                      placeholder="City"
                      disabled={!!form.internalOnly}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-1">
                    <Label>State</Label>
                    <Input
                      value={form.clientAddressState || ""}
                      onChange={(e) => {
                        if (!form.clientId) setClientMode("new");
                        updateField("internalOnly", false);
                        if (!form.clientId) updateField("clientId", "");
                        updateField("clientAddressState", e.target.value);
                      }}
                      placeholder="ST"
                      disabled={!!form.internalOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        {error ? (
          <div className="mx-6 mb-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-700/40 dark:bg-error-900/20 dark:text-error-200">
            {error}
          </div>
        ) : null}
        
        {/* ========================================================= */}
        {/*                          FOOTER                           */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-3 border-t border-divider bg-app-subtle px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                loading ||
                ticketLoading ||
                !isFormDirty ||
                !form.title.trim() ||
                !form.detail.trim() ||
                (!canCreate && !isEditing) ||
                (!canUpdate && isEditing)
              }
            >
              {loading
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : saveStatus === "success"
                ? "Saved"
                : saveStatus === "error"
                ? "Try Again"
                : isEditing
                ? "Save Changes"
                : "Create Ticket"}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
