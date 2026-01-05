import BrandBackground from "@/shared/components/common/BrandBackground";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-app text-app">
      <BrandBackground />
      {children}
    </div>
  );
}
