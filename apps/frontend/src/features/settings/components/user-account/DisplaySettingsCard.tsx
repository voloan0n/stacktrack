"use client";

import React, { useEffect, useMemo, useState } from "react";
import Label from "@/shared/components/form/Label";
import Button from "@/shared/components/ui/button/Button";
import Form from "@/shared/components/form/Form";
import Select from "@/shared/components/form/Select";
import { Theme, useTheme } from "@/shared/context/ThemeContext";
import { useAuth } from "@/features/auth/lib/provider";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import Badge from "@/shared/components/ui/badge/Badge";
import CardHeader from "@/shared/components/common/CardHeader";

const languageOptions = [{ value: "en", label: "English (US)" }];

const normalizeAccentKey = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "brand") return "primary";
  return trimmed;
};

const ACCENT_COLOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "System Default" },
  { value: "primary", label: "Default" },
  { value: "success", label: "Green" },
  { value: "warning", label: "Yellow" },
  { value: "error", label: "Red" },
  { value: "info", label: "Cyan" },
  { value: "neutral", label: "Gray" },
];

export default function DisplaySettingsCard() {
  const { theme, setTheme, themeOptions, textScale, setTextScale } = useTheme();
  const auth = useAuth();
  const [language, setLanguage] = useState("en");
  const initialTheme = useMemo(() => theme, [theme]);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(initialTheme);
  const initialAccent = useMemo(
    () => normalizeAccentKey(auth?.user?.accentColor ?? auth?.user?.avatarColor ?? ""),
    [auth?.user?.accentColor, auth?.user?.avatarColor]
  );
  const [accentColor, setAccentColor] = useState<string>(initialAccent);
  const [size, setSize] = useState<number>(textScale);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccentColor(initialAccent);
  }, [initialAccent]);

  useEffect(() => {
    setSize(textScale);
  }, [textScale]);

  const handleSave = () => {
    setSaving(true);
    setTheme(selectedTheme);
    setTextScale(size);

    const nextAccent = normalizeAccentKey(accentColor) || null;
    const currentAccent = auth?.user?.accentColor ?? auth?.user?.avatarColor ?? null;
    const accentChanged = nextAccent !== currentAccent;

    const finish = () => {
      setTimeout(() => setSaving(false), 300);
    };

    if (!accentChanged) {
      // future: send language preference to backend
      finish(); // lightweight UI feedback
      return;
    }

    fetch(`/api/proxy/user/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accentColor: nextAccent,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("We couldn't update your accent color. Please try again.");
        }
        const data = await res.json();
        const updated = data?.user ?? {};
        auth?.setUser?.((prev: any) => ({
          ...(prev || {}),
          ...updated,
          accentColor: updated.accentColor ?? nextAccent,
        }));
      })
      .catch(() => {
        // keep the UI quiet; the preview provides feedback
      })
      .finally(finish);
  };

  const previewThemeLabel =
    themeOptions.find((opt) => opt.value === selectedTheme)?.label ?? selectedTheme;
  const previewAccentKey = normalizeAccentKey(accentColor) || "primary";
  const previewAccentLabel =
    ACCENT_COLOR_OPTIONS.find((opt) => opt.value === previewAccentKey)?.label ??
    previewAccentKey.charAt(0).toUpperCase() + previewAccentKey.slice(1);

  return (
    <div className="overflow-hidden rounded-2xl border border-app bg-app-subtle shadow-sm">
      {/* ========================================================= */}
      {/*                      HEADER SECTION                       */}
      {/* ========================================================= */}
      <CardHeader
        eyebrow="Display"
        title="Theme & Language"
        description="Choose how the dashboard looks and the language you prefer."
      />

      <div className="px-5 py-6 lg:px-6">
        <Form onSubmit={handleSave} className="space-y-5">
          {/* ========================================================= */}
          {/*                        PREVIEW                            */}
          {/* ========================================================= */}
          <div
            data-theme={selectedTheme}
            className={`overflow-hidden rounded-2xl border border-app bg-app shadow-theme-sm ${
              selectedTheme === "dark" || selectedTheme === "dracula" ? "dark" : ""
            }`}
            style={{ fontSize: `${16 + size}px` }}
          >
            <div className="flex items-center justify-center px-6 py-4 sm:px-10 sm:py-5">
              <div className="w-full max-w-[920px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
	                  <div className="flex min-w-0 items-center gap-3">
	                    <UserIcon
	                      name={auth?.user?.name || "User"}
	                      color={previewAccentKey}
	                      size="md"
	                      className="h-12 w-12 shrink-0 aspect-square text-sm"
	                    />
	                    <div className="min-w-0">
	                      <div className="truncate text-base font-semibold text-app">
                        {auth?.user?.name || "StackTrack User"}
                      </div>
                      <div className="text-sm leading-snug text-app-muted">
                        {auth?.user?.role?.name || auth?.user?.role || "Team member"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2 sm:flex-nowrap">
                    <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-app-muted sm:inline">
                      Preview
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-app bg-app-subtle px-3 py-1.5 text-sm text-app">
                      <span className="text-app-muted">Theme</span>
                      <span className="font-medium">{previewThemeLabel}</span>
                    </span>

	                    <span className="inline-flex items-center gap-2 rounded-full border border-app bg-app-subtle px-3 py-1.5 text-sm text-app">
	                      <span className="text-app-muted">Accent</span>
	                      <Badge color={previewAccentKey} size="sm">
	                        {previewAccentLabel}
	                      </Badge>
	                    </span>

	                    <span className="inline-flex items-center gap-2 rounded-full border border-app bg-app-subtle px-3 py-1.5 text-sm text-app">
	                      <span className="text-app-muted">Text</span>
                      <span className="font-medium">
                        {size === 0 ? "Default" : size > 0 ? `+${size}` : `${size}`}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/*                       SETTINGS                            */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-app bg-app px-4 py-3">
              <Label>Theme</Label>
              <p className="mt-1 text-sm text-app-muted">
                Applies across the dashboard UI.
              </p>
              <div className="mt-3">
                <Select
                  options={themeOptions}
                  value={selectedTheme}
                  onChange={(value) => setSelectedTheme(value as Theme)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-app bg-app px-4 py-3">
              <Label>Accent color</Label>
              <p className="mt-1 text-sm text-app-muted">
                Updates the color used for your avatar.
              </p>
              <div className="mt-3">
                <Select
                  options={ACCENT_COLOR_OPTIONS}
                  value={accentColor}
                  onChange={(value) => setAccentColor(String(value))}
                />
              </div>
            </div>

            <div className="rounded-xl border border-app bg-app px-4 py-3">
              <Label>Language</Label>
              <p className="mt-1 text-sm text-app-muted">
                More languages are coming soon.
              </p>
              <div className="mt-3">
                <Select
                  options={languageOptions}
                  value={language}
                  onChange={(value) => setLanguage(value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-app bg-app px-4 py-3">
              <Label>Text size</Label>
              <p className="mt-1 text-sm text-app-muted">
                Adjusts text size across the app.
              </p>
              <div className="mt-4">
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={1}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)]"
                  aria-label="Text size"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-app-muted">
                  <span>-2</span>
                  <span>{size === 0 ? "Default" : size > 0 ? `+${size}` : `${size}`}</span>
                  <span>+2</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/*                         FOOTER                            */}
          {/* ========================================================= */}
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
