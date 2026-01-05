import {
  DisplaySettingsCard,
  NotificationSettingsCard,
  ProfileSettingsCard,
  SecuritySettingsCard,
} from "@/features/settings/components";
import SettingsLayout from "@/features/settings/components/SettingsLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings | StackTrack Dashboard",
  description: "Manage profile, security, and display preferences.",
};

export default function AccountSettingsPage() {
  return (
    <SettingsLayout title="Account Settings">
      <ProfileSettingsCard />
      <SecuritySettingsCard />
      <NotificationSettingsCard />
      <DisplaySettingsCard />
    </SettingsLayout>
  );
}
