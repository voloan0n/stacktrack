"use client";

// =========================================================
// Imports
// =========================================================
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import SupportTicketsTable from "@/features/tickets/components/SupportTicketsTable";
import TicketMetrics from "@/features/tickets/components/TicketMetrics";
import { useTicketData } from "@/features/tickets/hooks/useTicketData";
import { useAuth } from "@/features/auth/lib/provider";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Page
// =========================================================
export default function TicketsPage() {
  // ---------------------------------
  // Routing + URL state
  // ---------------------------------
  const router = useRouter();
  const searchParams = useSearchParams();
  const newTicket = (searchParams?.get("new") || "").trim() === "1";

  useEffect(() => {
    if (!newTicket) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("new");
    const next = params.toString();
    router.replace(next ? `/tickets?${next}` : "/tickets");
  }, [newTicket, router, searchParams]);

  // ---------------------------------
  // Permissions
  // ---------------------------------
  const { user } = useAuth() || { user: null };
  const { can } = usePermissions(user?.permissions);
  const canViewTickets = can("ticket.view");

  // ---------------------------------
  // Data
  // ---------------------------------
  const { tickets, loading, refetchTickets } = useTicketData(
    undefined,
    1,
    20,
    { enabled: canViewTickets }
  );
  const [selected, setSelected] = useState<string[]>([]);

  if (!canViewTickets) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb pageTitle="Support Tickets" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100">
          You do not have permission to view tickets.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Support Tickets" />

      <TicketMetrics tickets={tickets} />

      <SupportTicketsTable
        tickets={tickets}
        loading={loading}
        selected={selected}
        onSelectedChange={setSelected}
        onRefresh={refetchTickets}
        openCreateTicket={newTicket}
      />
    </div>
  );
}
