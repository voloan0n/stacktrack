"use client";

import { useCallback, useEffect, useState } from "react";

export type TicketOptionItem = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  nextActionDueHours?: number | null;
  order?: number;
  active?: boolean;
  isDefault?: boolean;
};

export type TicketOptions = {
  statuses: TicketOptionItem[];
  priorities: TicketOptionItem[];
  types: TicketOptionItem[];
  supportTypes: TicketOptionItem[];
  billingTypes: TicketOptionItem[];
};

const emptyOptions: TicketOptions = {
  statuses: [],
  priorities: [],
  types: [],
  supportTypes: [],
  billingTypes: [],
};

export default function useTicketOptions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<TicketOptions>(emptyOptions);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/ticket-options", { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load ticket options.");
      const data = await res.json().catch(() => ({}));

      setOptions({
        statuses: data.statuses || [],
        priorities: data.priorities || [],
        types: data.types || [],
        supportTypes: data.supportTypes || [],
        billingTypes: data.billingTypes || [],
      });
    } catch (err: any) {
      setError(err?.message || "Unable to load ticket options.");
      setOptions(emptyOptions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, options, reload };
}

