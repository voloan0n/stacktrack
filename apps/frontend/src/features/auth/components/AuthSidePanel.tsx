import Button from "@/shared/components/ui/button/Button";
import { LockIcon, PlugInIcon } from "@/shared/icons";
import React from "react";

export default function AuthSidePanel() {
  return (
    <aside className="hidden lg:flex flex-col justify-between rounded-3xl border border-app bg-app-subtle p-8 backdrop-blur-xl shadow-2xl shadow-brand-900/5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--color-semantic-brand-fg)_25%,var(--color-border))] bg-[var(--color-semantic-brand-bg)] text-lg font-semibold text-[var(--color-semantic-brand-fg)] shadow-lg shadow-brand-900/10">
          ST
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-semantic-brand-fg)]">
            StackTrack
          </p>
          <p className="text-2xl font-semibold text-app">Support Console</p>
        </div>
      </div>

      <div className="relative mt-6 flex-1 overflow-hidden rounded-3xl border border-divider bg-[color-mix(in_oklab,var(--stacktrack-surface-subtle)_72%,transparent)] p-6 shadow-md shadow-brand-900/5">
        <section aria-labelledby="signin-options-title" className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-semantic-brand-fg)]">
              Sign-in options
            </p>
            <h2 id="signin-options-title" className="text-lg font-semibold text-app">
              OAuth/OCID or Passkey
            </h2>
            <p className="max-w-md text-sm text-app-muted">
              Privacy-first sign-in options for your workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              disabled
              startIcon={<PlugInIcon className="h-5 w-5 text-app-muted" />}
            >
              OAuth / OCID
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              disabled
              startIcon={<LockIcon className="h-5 w-5 text-white/90" />}
            >
              Passkey
            </Button>
            <p className="col-span-2 text-xs text-app-muted">OAuth/OCID and passkeys are coming soon.</p>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="about-stacktrack-title"
        className="mt-6 rounded-2xl border border-app bg-app-subtle p-5 shadow-md shadow-brand-900/5"
      >
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-semantic-brand-fg)]">
          Why StackTrack
        </p>
        <h3 id="about-stacktrack-title" className="mt-2 text-lg font-semibold text-app">
          Self-hosted support, built for privacy
        </h3>
        <p className="mt-1 text-sm text-app-muted">
          A data-private alternative to big-name ticketing platforms.
        </p>
      </section>
    </aside>
  );
}
