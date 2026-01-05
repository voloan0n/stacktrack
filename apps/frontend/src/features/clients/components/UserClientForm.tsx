"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import CardHeader from "@/shared/components/common/CardHeader";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import TextArea from "@/shared/components/form/input/TextArea";
import PhoneInput from "@/shared/components/form/group-input/PhoneInput";
import { EnvelopeIcon } from "@/shared/icons";
import Select from "@/shared/components/form/Select";
import { normalizePhone } from "@/shared/utils/phone";

type FormState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  addressCountry: string;
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  notes: string;
};

interface ClientFormProps {
  client: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  disableDetailFetch?: boolean;
  disabledSections?: {
    address?: boolean;
    notes?: boolean;
  };
}

export default function UserClientForm({
  client,
  isOpen,
  onClose,
  onSave,
  onDelete: _onDelete,
  disableDetailFetch = false,
  disabledSections,
}: ClientFormProps) {
  const emptyForm: FormState = {
    id: "",
    name: "",
    email: "",
    phone: "",
    addressCountry: "US",
    addressLine1: "",
    addressCity: "",
    addressState: "",
    addressPostal: "",
    notes: "",
  };
  const [formData, setFormData] = useState<FormState | null>(null);
  const [initialFormData, setInitialFormData] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const asString = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const trimOrNull = (value: unknown) => {
    const trimmed = asString(value).trim();
    return trimmed ? trimmed : null;
  };

  const selectValue = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "value" in value) {
      return asString((value as any).value);
    }
    return asString(value);
  };

  const formatUsPhone = (value?: string | null) => {
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

  const toFormState = (data: any): FormState => {
    const baseName = data.name || "";
    const addr = data.address || data.physicalAddress || {};
    return {
      id: data.id,
      name: baseName,
      email: data.email || "",
      phone: normalizePhone(data.phone) || "",
      addressCountry: asString(addr.country || data.addressCountry || data.country || "US") || "US",
      addressLine1: asString(addr.line1 || data.addressLine1 || ""),
      addressCity: asString(addr.city || data.addressCity || ""),
      addressState: asString(addr.state || data.addressState || ""),
      addressPostal: asString(addr.postal || data.addressPostal || ""),
      notes: asString(data.miscNotes ?? data.notes ?? ""),
    };
  };

  useEffect(() => {
    let ignore = false;
    const loadDetails = async () => {
      if (!isOpen) return;
      if (!client) {
        setFormData(emptyForm);
        setInitialFormData(emptyForm);
        return;
      }
      if (disableDetailFetch) {
        const next = toFormState(client);
        setFormData(next);
        setInitialFormData(next);
        return;
      }
      setIsLoading(true);

      try {
        const res = await fetch(`/api/proxy/clients/${client.id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load client details");

        const data = await res.json();
        if (ignore) return;
        const hydrated = toFormState(data?.client ?? client);
        setFormData(hydrated);
        setInitialFormData(hydrated);
      } catch (err) {
        console.error("❌ Failed to load client detail:", err);
        if (ignore) return;
        const fallback = toFormState(client);
        setFormData(fallback);
        setInitialFormData(fallback);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadDetails();
    return () => {
      ignore = true;
    };
  }, [client, isOpen]);

  if (!isOpen || !formData) return null;

  const isEditing = Boolean(client && client.id);
  const updateField = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }));

  const normalizeText = (value: unknown) => String(value ?? "").trim();

  const isUserContext = Boolean(disabledSections?.address && disabledSections?.notes);
  const headerEyebrow = isUserContext ? "Account" : "Client";
  const headerTitle = isUserContext
    ? (normalizeText(formData.name) || "Edit profile")
    : isEditing
      ? `Update ${normalizeText(formData.name) || "Client"}`
      : "Add Client";
  const headerDescription = isUserContext
    ? "Edit your profile details."
    : "Keep contact + billing context tidy for reuse.";
  const contactDetailsTitle = isUserContext ? "Profile details" : "Client details";
  const nameLabel = isUserContext ? "Name" : "Client name";
  const namePlaceholder = isUserContext ? "Jane Doe" : "Acme Inc.";

  const isDirty = (() => {
    if (!initialFormData) return false;
    const a = initialFormData;
    const b = formData;

    const dirtyBase =
      normalizeText(a.name) !== normalizeText(b.name) ||
      normalizeText(a.email) !== normalizeText(b.email) ||
      (normalizePhone(a.phone) || "") !== (normalizePhone(b.phone) || "") ||
      normalizeText(a.addressCountry) !== normalizeText(b.addressCountry);

    const dirtyAddress = disabledSections?.address
      ? false
      : normalizeText(a.addressLine1) !== normalizeText(b.addressLine1) ||
        normalizeText(a.addressCity) !== normalizeText(b.addressCity) ||
        normalizeText(a.addressState) !== normalizeText(b.addressState) ||
        normalizeText(a.addressPostal) !== normalizeText(b.addressPostal);

    const dirtyNotes = disabledSections?.notes
      ? false
      : normalizeText(a.notes) !== normalizeText(b.notes);

    return dirtyBase || dirtyAddress || dirtyNotes;
  })();

  const handleSave = () => {
    if (!formData) return;
    if (!isDirty) return;
    onSave({
      id: formData.id,
      name: asString(formData.name).trim() || (isUserContext ? "Unnamed User" : "New Client"),
      email: asString(formData.email),
      phone: normalizePhone(formData.phone),
      addressLine1: trimOrNull(formData.addressLine1),
      addressCity: trimOrNull(formData.addressCity),
      addressState: trimOrNull(formData.addressState),
      addressPostal: trimOrNull(formData.addressPostal),
      country: trimOrNull(formData.addressCountry) || "US",
      notes: asString(formData.notes),
    });
  };

  const countryOptions = [
    { label: "USA", value: "US" },
    { label: "Canada", value: "CA" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl m-4">
      <div className="overflow-hidden rounded-3xl border border-app bg-app shadow-theme-lg">
        <CardHeader
          eyebrow={headerEyebrow}
          title={headerTitle}
          description={headerDescription}
        />

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-app bg-app p-5 shadow-theme-xs">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                    Contact
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app">
                    {contactDetailsTitle}
                  </p>
                </div>
                {isLoading ? (
                  <p className="text-xs text-app-muted">Loading…</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{nameLabel}</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder={namePlaceholder}
                    />
                  </div>

	                  <div>
	                    <Label>Phone</Label>
	                    <PhoneInput
	                      country={formData.addressCountry || "US"}
	                      placeholder="(555) 555-5555"
	                      value={formatUsPhone(formData.phone)}
	                      onChange={(val) => updateField("phone", normalizePhone(val) || "")}
	                    />
	                  </div>
	                </div>

                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="pl-12"
                      placeholder="name@company.com"
                    />
                    <span className="absolute inset-y-0 left-0 flex h-full items-center border-r border-app px-3 text-app-muted">
                      <span className="flex h-5 w-5 items-center justify-center">
                        <EnvelopeIcon className="h-4 w-4 shrink-0" />
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={`rounded-2xl border border-app bg-app p-5 shadow-theme-xs ${
                disabledSections?.address ? "pointer-events-none opacity-60" : ""
              }`}
              aria-disabled={disabledSections?.address ? "true" : "false"}
            >
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  Address
                </p>
                <p className="mt-1 text-sm font-semibold text-app">
                  Location fields
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-[2fr_3fr]">
                  <div>
                    <Label>Country</Label>
                    <Select
                      options={countryOptions}
                      value={formData.addressCountry || "US"}
                      onChange={(value) =>
                        updateField("addressCountry", selectValue(value) || "US")
                      }
                    />
                  </div>
                  <div>
                    <Label>Address Line 1</Label>
                    <Input
                      value={formData.addressLine1 || ""}
                      onChange={(e) => updateField("addressLine1", e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[3fr_1fr_1fr]">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.addressCity || ""}
                      onChange={(e) => updateField("addressCity", e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.addressState || ""}
                      onChange={(e) => updateField("addressState", e.target.value)}
                      placeholder="ST"
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={formData.addressPostal || ""}
                      onChange={(e) => updateField("addressPostal", e.target.value)}
                      placeholder="94105"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-app bg-app p-5 shadow-theme-xs lg:col-span-2">
            <div className="mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                Notes
              </p>
            </div>
            <div
              className={disabledSections?.notes ? "pointer-events-none opacity-60" : ""}
              aria-disabled={disabledSections?.notes ? "true" : "false"}
            >
              <TextArea
                rows={1}
                value={formData.notes || ""}
                onChange={(value) => updateField("notes", value)}
                placeholder="Add notes (billing terms, preferred contact, hours, etc.)"
                className="text-app placeholder:text-app-muted"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-app bg-app-subtle px-6 py-4">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading || !isDirty}>
              {isEditing ? "Save Changes" : "Add Client"}
            </Button>
        </div>
      </div>
    </Modal>
  );
}
