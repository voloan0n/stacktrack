"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeTicket, normalizeTicketList } from "@/features/tickets/utils/normalizers";
import { fetchTicketDetail, fetchTicketList } from "@/features/tickets/services/api";

type UseTicketReturn = {
  ticket: any | null;
  tickets: any[];
  total: number;
  loading: boolean;
  error: string | null;
  refetchTickets: () => Promise<void>;
};

type UseTicketDataOptions = {
  enabled?: boolean;
};

export function useTicketData(
  ticketId?: string,
  page: number = 1,
  limit: number = 20,
  options: UseTicketDataOptions = {}
): UseTicketReturn {
  const { enabled = true } = options;
  const mountedRef = useRef(false);
  const [ticket, setTicket] = useState<any | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTicketData = useCallback(async () => {
    if (!enabled) {
      if (mountedRef.current) {
        setLoading(false);
        setError(null);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (ticketId) {
        console.log("🎯 [useTicketData] Fetching SINGLE ticket:", ticketId);

        const data = await fetchTicketDetail(ticketId);

        console.log("📡 [useTicketData] RAW Detail API Payload:", JSON.parse(JSON.stringify(data)));

        const normalized = normalizeTicket(data?.ticket || data);

        console.log("🔄 [useTicketData] Normalized Detail:", JSON.parse(JSON.stringify(normalized)));

        if (mountedRef.current) {
          setTicket(normalized);
          setTickets([]);
          setTotal(normalized ? 1 : 0);
        }

        return;
      }

      console.log("🎯 [useTicketData] Fetching TICKET LIST", { page, limit });

      const data = await fetchTicketList(page, limit);

      console.log("📡 [useTicketData] RAW List API Payload:", JSON.parse(JSON.stringify(data)));

      const normalized = normalizeTicketList(data?.tickets ?? []);

      console.log("🔄 [useTicketData] Normalized List:", JSON.parse(JSON.stringify(normalized)));

      if (mountedRef.current) {
        setTicket(null);
        setTickets(normalized);
        setTotal(data?.total ?? normalized.length);
      }

    } catch (err: any) {
      console.error("🔥 [useTicketData] Error:", err?.message || err);
      if (mountedRef.current) setError(err?.message || "Failed to load ticket data");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ticketId, page, limit, enabled]);

  useEffect(() => {
    if (!enabled) {
      setTicket(null);
      setTickets([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }

    fetchTicketData();
  }, [fetchTicketData, enabled]);

  return {
    ticket,
    tickets,
    total,
    loading,
    error,
    refetchTickets: fetchTicketData,
  };
}
