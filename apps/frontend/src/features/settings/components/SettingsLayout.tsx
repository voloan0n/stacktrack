import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import React from "react";

type SettingsLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export default function SettingsLayout({ title, children }: SettingsLayoutProps) {
  return (
      <div className="space-y-4">
        <PageBreadcrumb pageTitle={title} />
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}
