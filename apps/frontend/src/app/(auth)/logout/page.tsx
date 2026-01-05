"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutClient } from "@/features/auth/lib/client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logoutClient().finally(() => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("onboardingDismissed");
      }
      router.replace("/login");
    });
  }, [router]);

  return null;
}
