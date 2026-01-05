"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Checkbox from "@/shared/components/form/input/Checkbox";
import Input from "@/shared/components/form/input/InputField";
import Label from "@/shared/components/form/Label";
import Button from "@/shared/components/ui/button/Button";
import Alert from "@/shared/components/ui/alert/Alert";
import { EyeCloseIcon, EyeIcon, LockIcon } from "@/shared/icons";
import { loginClient } from "@/features/auth/lib/client";

export default function SignInForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";

    try {
      const result = await loginClient(email, password, isChecked);

      if (!result.success) {
        setError(result.message || "Invalid email or password");
        return;
      }

      router.push("/tickets");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full max-w-xl">
      <section
        aria-labelledby="signin-title"
        className="overflow-hidden rounded-3xl border border-app bg-app-subtle shadow-2xl shadow-brand-950/10"
      >
        <header className="border-b border-app bg-app-subtle px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-semantic-brand-fg)_25%,var(--color-border))] bg-[var(--color-semantic-brand-bg)] text-[var(--color-semantic-brand-fg)]">
              <LockIcon className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-semantic-brand-fg)]">
                StackTrack
              </p>
              <h1 id="signin-title" className="text-xl font-semibold text-app">
                Sign in to your workspace
              </h1>
              <p className="text-sm text-app-muted">
                Secure access to tickets, clients, and notifications.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {error && (
            <Alert variant="error" title="Sign in failed" message={error} />
          )}

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-error-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-app-muted transition hover:bg-app-subtle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                aria-controls="password"
              >
                {showPassword ? (
                  <EyeIcon className="h-5 w-5 fill-current" />
                ) : (
                  <EyeCloseIcon className="h-5 w-5 fill-current" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <span className="text-sm font-medium text-app">Keep me logged in</span>
            </label>

            <button
              type="button"
              disabled
              title="Coming soon"
              className="text-sm font-medium text-[var(--color-primary)] opacity-60 cursor-not-allowed"
            >
              Forgot password?
            </button>
          </div>

          <Button className="w-full" size="md" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="flex items-center justify-between pt-3 text-xs text-app-muted">
            <span>SSO coming soon</span>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="font-semibold text-[var(--color-primary)] opacity-60 cursor-not-allowed"
            >
              Create account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
