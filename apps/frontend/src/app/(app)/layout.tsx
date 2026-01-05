export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getUser } from "@/features/auth/lib/user";
import { AuthProvider } from "@/features/auth/lib/provider";
import { SidebarProvider } from "@/shared/context/SidebarContext";
import AdminShell from "./AdminShell";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider userKey={user?.email || user?.id || "unknown-user"}>
        <AdminShell user={user}>{children}</AdminShell>
      </SidebarProvider>
    </AuthProvider>
  );
}
