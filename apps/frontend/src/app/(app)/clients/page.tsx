"use client";

// =========================================================
// Imports
// =========================================================
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/shared/components/common/PageBreadCrumb";
import ClientListTable from "@/features/clients/components/ClientTable";
import { useClientData } from "@/features/clients/hooks/useClientData";
import { useAuth } from "@/features/auth/lib/provider";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Page
// =========================================================
export default function ClientsPage() {
  // ---------------------------------
  // Routing + URL state
  // ---------------------------------
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 25;
  const searchParams = useSearchParams();
  const q = (searchParams?.get("q") || "").trim();
  const newClient = (searchParams?.get("new") || "").trim() === "1";

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (!newClient) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("new");
    const next = params.toString();
    router.replace(next ? `/clients?${next}` : "/clients");
  }, [newClient, router, searchParams]);

  // ---------------------------------
  // Permissions
  // ---------------------------------
  const { user } = useAuth() || { user: null };
  const { can } = usePermissions(user?.permissions);
  const canViewClients = can("client.view");

  // ---------------------------------
  // Data
  // ---------------------------------
  const { clients, loading, total, refetchClients } = useClientData(undefined, page, limit, q);
  const totalPages = Math.ceil((total || 0) / limit);

  if (!canViewClients) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb pageTitle="Clients" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100">
          You do not have permission to view clients.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Clients" />

      <ClientListTable
        clients={clients}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRefresh={refetchClients}
        openCreateClient={newClient}
      />
    </div>
  );
}
