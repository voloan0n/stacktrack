import BrandBackground from "@/shared/components/common/BrandBackground";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app p-6 text-app">
      <BrandBackground />
      <section className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-app bg-app-subtle p-8 text-center shadow-2xl shadow-brand-950/10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--color-semantic-brand-fg)_25%,var(--color-border))] bg-[var(--color-semantic-brand-bg)] text-lg font-semibold text-[var(--color-semantic-brand-fg)]">
          ST
        </div>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-semantic-brand-fg)]">
          StackTrack
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-app">Page Not Found</h1>
        <p className="mt-2 text-sm text-app-muted">
          The page you’re looking for doesn’t exist or was moved.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs hover:opacity-90"
          >
            Go to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-app px-5 py-3.5 text-sm font-medium text-app ring-1 ring-inset ring-[var(--color-border)] hover:bg-app-subtle"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
