"use client";

import { useEffect, useState, useCallback } from "react";
import {
  normalizeClient,
  normalizeClientList,
} from "@/features/clients/utils/normalizers";

type UseClientReturn = {
  client: any | null;
  clients: any[];
  total: number;
  loading: boolean;
  error: string | null;
  refetchClients: () => Promise<void>;
};

export function useClientData(
  clientId?: string,
  page: number = 1,
  limit: number = 20,
  search: string = ""
): UseClientReturn {
  const [client, setClient] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // =================================
      // SINGLE CLIENT MODE
      // =================================
      if (clientId) {
        const res = await fetch(`/api/proxy/clients/${clientId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch client");

        const data = await res.json();
        setClient(normalizeClient(data?.client));
        setClients([]);
        setTotal(1);
        return;
      }

      // =================================
      // CLIENT LIST MODE
      // =================================
      const res = await fetch(
        `/api/proxy/clients?page=${page}&limit=${limit}&search=${search}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch clients");

      const data = await res.json();
      const normalized = normalizeClientList(data?.clients ?? []);

      setClient(null);
      setClients(normalized);
      setTotal(data?.total ?? normalized.length);
    } catch (err) {
      console.error("🔥 useClientData Error:", err);
      setError("Failed to load client data");
    } finally {
      setLoading(false);
    }
  }, [clientId, page, limit, search]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  return {
    client,
    clients,
    total,
    loading,
    error,
    refetchClients: fetchClientData, // 🚀 expose for UI refresh
  };
}
