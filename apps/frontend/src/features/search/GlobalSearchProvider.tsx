"use client";

// =========================================================
// Imports
// =========================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeTicketList } from "@/features/tickets/utils/normalizers";
import { useAuth } from "@/features/auth/lib/provider";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Types
// =========================================================
type SearchGroupKey = "actions" | "tickets" | "clients" | "settings";

type SearchItem = {
  id: string;
  group: SearchGroupKey;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href: string;
};

type GlobalSearchContextValue = {
  open: (opts?: { mode?: "launchpad" | "search" }) => void;
  close: () => void;
  isOpen: boolean;
  isLaunchpadOpen: boolean;
  query: string;
  setQuery: (q: string) => void;
  focusSearchInput: (opts?: { select?: boolean }) => void;
  handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  registerSearchInput: (el: HTMLInputElement | null) => void;
  items: SearchItem[];
  grouped: Record<SearchGroupKey, SearchItem[]>;
  indexById: Map<string, number>;
  activeIndex: number;
  loading: boolean;
  navigateTo: (href: string) => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function useLaunchpad() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error("useLaunchpad must be used within LaunchpadProvider");
  return ctx;
}

// =========================================================
// Helpers
// =========================================================
function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function includesAllTokens(haystack: string, needles: string[]) {
  const lower = haystack.toLowerCase();
  return needles.every((needle) => lower.includes(needle));
}

// =========================================================
// Provider
// =========================================================
export default function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth() || { user: null };
  const { can } = usePermissions((user as any)?.permissions);
  const canManageSettings = can("settings.manage");
  const canViewTickets = can("ticket.view");
  const canCreateTickets = can("ticket.create");
  const canViewClients = can("client.view");
  const canManageClients = can("client.manage");

  const [isOpen, setIsOpen] = useState(false);
  const [openMode, setOpenMode] = useState<"launchpad" | "search">("search");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const [ticketCache, setTicketCache] = useState<any[] | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketCacheError, setTicketCacheError] = useState(false);
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastClientRequestRef = useRef<number>(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setOpenMode("search");
    setActiveIndex(0);
  }, []);

  const open = useCallback((opts?: { mode?: "launchpad" | "search" }) => {
    setIsOpen(true);
    setOpenMode(opts?.mode ?? "search");
    setActiveIndex(0);
    setTicketCacheError(false);
  }, []);

  const registerSearchInput = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    try {
      if (el.getClientRects().length === 0) return;
    } catch {
      return;
    }
    searchInputRef.current = el;
  }, []);

  const focusSearchInput = useCallback((opts?: { select?: boolean }) => {
    let el = searchInputRef.current;
    const isVisible = (candidate: HTMLInputElement | null) => {
      if (!candidate) return false;
      try {
        return candidate.getClientRects().length > 0;
      } catch {
        return false;
      }
    };

    if (!isVisible(el)) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLInputElement>("[data-global-search-input]")
      );
      el = candidates.find((candidate) => isVisible(candidate)) ?? null;
      if (el) searchInputRef.current = el;
    }

    if (!el) return;
    el.focus();
    if (opts?.select) el.select();
  }, []);

  const fetchTicketsOnce = useCallback(async () => {
    if (!canViewTickets) return;
    if (ticketCache !== null || loadingTickets) return;
    setLoadingTickets(true);
    try {
      // Prefer the same list endpoint used by the tickets UI.
      const res = await fetch("/api/proxy/tickets?page=1&limit=250", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch tickets (${res.status})`);
      const json = await res.json().catch(() => null);
      const list = normalizeTicketList(json?.tickets ?? []);
      setTicketCache(list);
      setTicketCacheError(false);
    } catch {
      setTicketCacheError(true);
      setTicketCache(null);
    } finally {
      setLoadingTickets(false);
    }
  }, [canViewTickets, loadingTickets, ticketCache]);

  const fetchClients = useCallback(async (q: string) => {
    if (!canViewClients) return;
    const reqId = Date.now();
    lastClientRequestRef.current = reqId;
    setLoadingClients(true);
    try {
      const res = await fetch(
        `/api/proxy/clients?page=1&limit=8&search=${encodeURIComponent(q)}`,
        { cache: "no-store", credentials: "include" }
      );
      const json = await res.json().catch(() => null);
      if (lastClientRequestRef.current !== reqId) return;
      setClientResults(Array.isArray(json?.clients) ? json.clients : []);
    } catch {
      if (lastClientRequestRef.current !== reqId) return;
      setClientResults([]);
    } finally {
      if (lastClientRequestRef.current !== reqId) return;
      setLoadingClients(false);
    }
  }, [canViewClients]);

  // (Launchpad modal removed) — global search UI now renders inline in the header.

  useEffect(() => {
    if (!isOpen) return;
    if (!canViewClients) {
      setClientResults([]);
      setLoadingClients(false);
      return;
    }
    if (query.trim().length < 2) {
      setClientResults([]);
      setLoadingClients(false);
      return;
    }
    const id = window.setTimeout(() => {
      fetchClients(query.trim());
    }, 160);
    return () => window.clearTimeout(id);
  }, [canViewClients, fetchClients, isOpen, query]);

  useEffect(() => {
    if (!isOpen) return;
    if (!canViewTickets) return;
    if (ticketCache !== null) return;
    if (loadingTickets) return;
    if (ticketCacheError) return;
    fetchTicketsOnce();
  }, [canViewTickets, fetchTicketsOnce, isOpen, loadingTickets, ticketCache, ticketCacheError]);

  const items = useMemo(() => {
    const q = normalizeQuery(query);
    const tokens = q.split(/\s+/).filter(Boolean);

    const quickActions: SearchItem[] = [
      ...(canViewTickets
        ? [{ id: "action:tickets", group: "actions" as const, title: "Go to Tickets", subtitle: "/tickets", href: "/tickets" }]
        : []),
      ...(canViewClients
        ? [{ id: "action:clients", group: "actions" as const, title: "Go to Clients", subtitle: "/clients", href: "/clients" }]
        : []),
      ...(canCreateTickets
        ? [
            {
              id: "action:new-ticket",
              group: "actions" as const,
              title: "New Ticket",
              subtitle: "Create a new support ticket",
              href: "/tickets?new=1",
            },
          ]
        : []),
      ...(canManageClients
        ? [
            {
              id: "action:new-client",
              group: "actions" as const,
              title: "New Client",
              subtitle: "Add a new client",
              href: "/clients?new=1",
            },
          ]
        : []),
      { id: "action:logout", group: "actions" as const, title: "Log out", subtitle: "/logout", href: "/logout" },
    ];

    const settings: SearchItem[] = [
      {
        id: "settings:account",
        group: "settings",
        title: "Account Settings",
        subtitle: "/settings/account",
        href: "/settings/account",
      },
      ...(canManageSettings
        ? ([
            { id: "settings:admin-users", title: "User Management Settings", href: "/settings/admin#settings-users" },
            { id: "settings:admin-roles", title: "Roles Management Settings", href: "/settings/admin#settings-roles" },
            { id: "settings:admin-status", title: "Status Types Settings", href: "/settings/admin#settings-statuses" },
            { id: "settings:admin-priority", title: "Priority Settings", href: "/settings/admin#settings-priorities" },
            { id: "settings:admin-category", title: "Category Settings", href: "/settings/admin#settings-categories" },
            { id: "settings:admin-support", title: "Support Types Settings", href: "/settings/admin#settings-support-types" },
            { id: "settings:admin-billing", title: "Billing Types Settings", href: "/settings/admin#settings-billing-types" },
          ] as const).map((item) => ({
            id: item.id,
            group: "settings" as const,
            title: item.title,
            subtitle: "/settings/admin",
            href: item.href,
          }))
        : []),
    ];

    const tickets: SearchItem[] = [];
    const ticketList = ticketCache || [];
    if (canViewTickets && tokens.length > 0 && ticketList.length > 0) {
      for (const ticket of ticketList) {
        if (!ticket) continue;
        const ticketNumber = typeof ticket.number === "number" ? ticket.number : Number(ticket.number);
        const paddedNumber =
          Number.isFinite(ticketNumber) && ticketNumber > 0 ? String(ticketNumber).padStart(6, "0") : "";
        const displayId = String(ticket.displayId || "");
        const displayIdNoHash = displayId.startsWith("#") ? displayId.slice(1) : displayId;
        const haystack = [
          displayId,
          displayIdNoHash,
          ticketNumber ? String(ticketNumber) : "",
          paddedNumber,
          ticket.title,
          ticket.status,
          ticket.priority,
          ticket.type,
          ticket.client?.name,
          ticket.client?.email,
          ticket.client?.phone,
          ticket.requester?.name,
          ticket.requester?.email,
          ...(Array.isArray(ticket.assignees) ? ticket.assignees.map((u: any) => u?.name) : []),
        ]
          .filter(Boolean)
          .join(" ");
        if (!includesAllTokens(haystack, tokens)) continue;

        tickets.push({
          id: `ticket:${ticket.id}`,
          group: "tickets",
          eyebrow: ticket.displayId,
          title: ticket.title,
          subtitle: ticket.client?.name
            ? `${ticket.client.name} • ${ticket.status}`
            : ticket.requester?.name
              ? `${ticket.requester.name} • ${ticket.status}`
              : ticket.status,
          href: `/tickets/${ticket.id}`,
        });

        if (tickets.length >= 10) break;
      }
    }

    const clients: SearchItem[] = [];
    if (canViewClients && tokens.length > 0 && clientResults.length > 0) {
      for (const client of clientResults) {
        const label = client?.name || client?.company || "Client";
        const sub = [client?.email, client?.phone].filter(Boolean).join(" • ");
        clients.push({
          id: `client:${client?.id || label}`,
          group: "clients",
          title: label,
          subtitle: sub || "Open in clients",
          href: `/clients?q=${encodeURIComponent(label)}`,
        });
      }
    }

    if (canViewTickets && clients.length > 0 && ticketList.length > 0) {
      const matchedClientIds = new Set(
        clientResults.map((client) => String(client?.id || "")).filter(Boolean)
      );
      const seenTicketIds = new Set(tickets.map((item) => item.id));

      for (const ticket of ticketList) {
        const clientId = ticket?.client?.id;
        if (!clientId) continue;
        if (!matchedClientIds.has(String(clientId))) continue;
        const id = `ticket:${ticket.id}`;
        if (seenTicketIds.has(id)) continue;
        seenTicketIds.add(id);
        tickets.push({
          id,
          group: "tickets",
          eyebrow: ticket.displayId,
          title: ticket.title,
          subtitle: ticket.client?.name
            ? `${ticket.client.name} • ${ticket.status}`
            : ticket.requester?.name
              ? `${ticket.requester.name} • ${ticket.status}`
              : ticket.status,
          href: `/tickets/${ticket.id}`,
        });
        if (tickets.length >= 12) break;
      }
    }

    const filterStatic = (list: SearchItem[]) => {
      if (tokens.length === 0) return list;
      return list.filter((item) => includesAllTokens(`${item.title} ${item.subtitle || ""}`, tokens));
    };

    const out: SearchItem[] = [];
    if (tokens.length === 0) {
      out.push(...quickActions);
      return out;
    }

    out.push(...filterStatic(settings));
    out.push(...tickets);
    out.push(...clients);
    out.push(...filterStatic(quickActions));
    return out;
  }, [canCreateTickets, canManageClients, canManageSettings, canViewClients, canViewTickets, clientResults, query, ticketCache]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, query]);

  const grouped = useMemo(() => {
    const groups: Record<SearchGroupKey, SearchItem[]> = {
      actions: [],
      tickets: [],
      clients: [],
      settings: [],
    };

    for (const item of items) groups[item.group].push(item);
    return groups;
  }, [items]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [items]);

  const handleNavigate = useCallback(
    (href: string) => {
      setQuery("");
      close();
      router.push(href);
    },
    [close, router]
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item) handleNavigate(item.href);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    },
    [activeIndex, handleNavigate, items]
  );

  const contextValue = useMemo(() => {
    return {
      open,
      close,
      isOpen,
      isLaunchpadOpen: isOpen && openMode === "launchpad",
      query,
      setQuery,
      focusSearchInput,
      handleSearchKeyDown,
      registerSearchInput,
      items,
      grouped,
      indexById,
      activeIndex,
      loading: loadingTickets || loadingClients,
      navigateTo: handleNavigate,
    };
  }, [
    activeIndex,
    close,
    focusSearchInput,
    grouped,
    handleNavigate,
    handleSearchKeyDown,
    indexById,
    isOpen,
    items,
    loadingClients,
    loadingTickets,
    openMode,
    open,
    query,
    registerSearchInput,
    setQuery,
  ]);

  return (
    <GlobalSearchContext.Provider value={contextValue}>
      {children}
    </GlobalSearchContext.Provider>
  );
}
