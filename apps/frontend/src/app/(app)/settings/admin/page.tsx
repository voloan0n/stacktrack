import { getUser } from "@/features/auth/lib/user";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import {
  BillingTypesSettingsCard,
  RolesSettingsCard,
  CategorySettingsCard,
  PrioritySettingsCard,
  StatusSettingsCard,
  TypeSettingsCard,
  UsersSettingsCard,
  NotificationTemplatesSettingsCard,
} from "@/features/settings/components";

export const metadata: Metadata = {
  title: "Admin Settings | StackTrack Dashboard",
  description: "Admin-only organization and system settings.",
};

export default async function AdminSettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const permissions: string[] = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  const canAccessAdmin =
    permissions.includes("settings.manage") || permissions.includes("*");

  if (!canAccessAdmin) {
    redirect("/settings/account");
  }

  return (
    <div className="space-y-4">
      <PageBreadcrumb pageTitle="Admin Settings" />

      <div className="mt-6 space-y-6">
        <UsersSettingsCard />
        <RolesSettingsCard />
        <NotificationTemplatesSettingsCard />

        <StatusSettingsCard />
        <div className="grid gap-6 lg:grid-cols-2">
          <PrioritySettingsCard />
          <CategorySettingsCard />
          <TypeSettingsCard />
          <BillingTypesSettingsCard />
        </div>
      </div>
    </div>
  );
}
