import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import { ArrowRightIcon } from "@/shared/icons";
import { getUser } from "@/features/auth/lib/user";

export const metadata: Metadata = {
  title: "Settings | StackTrack Dashboard",
  description: "Choose between account and admin settings",
};

export default async function SettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const links = [
    {
      title: "Account settings",
      description: "Profile, security, and display preferences for your account.",
      href: "/settings/account",
    },
    user?.isAdmin
      ? {
          title: "Admin settings",
          description: "Organization-level controls and admin-only preferences.",
          href: "/settings/admin",
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; href: string }[];

  return (
    <div>
      <div className="min-h-screen rounded-2xl border border-app bg-app px-5 py-7 xl:px-10 xl:py-12">
        <PageBreadcrumb pageTitle="Settings" />

        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-2xl border border-app bg-app-subtle px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <p className="text-base font-semibold text-app">
                  {link.title}
                </p>
                <p className="mt-1 text-sm text-app-muted">
                  {link.description}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-subtle text-app">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
