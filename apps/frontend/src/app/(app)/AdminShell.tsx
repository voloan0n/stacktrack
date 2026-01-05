"use client";

// =========================================================
// Imports
// =========================================================
import { ReactNode, useEffect } from "react";
import AppSidebar from "@/features/layout/components/AppSidebar";
import Backdrop from "@/features/layout/components/Backdrop";
import AppHeader from "@/features/layout/components/AppHeader";
import { useAuth } from "@/features/auth/lib/provider";
import GlobalSearchProvider from "@/features/search/GlobalSearchProvider";
import { useSidebar } from "@/shared/context/SidebarContext";
import { usePathname, useRouter } from "next/navigation";

// =========================================================
// Types
// =========================================================
interface UserInfo {
  name?: string;
  email?: string;
  image?: string;
  avatarColor?: string | null;
  accentColor?: string | null;
}

interface AdminShellProps {
  children: ReactNode;
  user?: UserInfo;
}

export default function AdminShell({ children, user }: AdminShellProps) {
  // ---------------------------------
  // Context
  // ---------------------------------
  const { state, isMobile, isLockedOpen } = useSidebar();
  const auth = useAuth();
  const authUser = auth?.user ?? user;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authUser?.firstLogin) return;
    if (pathname?.startsWith("/settings")) return;
    router.replace("/settings/account#security");
  }, [authUser?.firstLogin, pathname, router]);

  // ---------------------------------
  // Layout
  // ---------------------------------
  const sidebarMargin =
    !isMobile && state === "open" ? (isLockedOpen ? "lg:ml-[264px]" : "lg:ml-[76px]") : "ml-0";

  const headerUser = authUser ?? user;

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />

      <main className={`relative flex-1 transition-all duration-200 ease-in-out ${sidebarMargin}`}>
        <GlobalSearchProvider>
          <AppHeader user={headerUser} />

          {/* Page Content Container */}
          <div className="mx-auto max-w-(--breakpoint-2xl) p-4 pt-[128px] md:p-6 md:pt-[132px] lg:pt-[96px]">
            {children}
          </div>
        </GlobalSearchProvider>
      </main>
    </div>
  );
}
