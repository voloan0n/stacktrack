"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import NotificationTimelineEntry, { type NotificationEntry } from "@/shared/components/common/NotificationTimelineEntry";
import Button from "@/shared/components/ui/button/Button";

export default function LaunchpadNotificationCenter({
  active,
}: {
  active: boolean;
}) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openedAt, setOpenedAt] = useState(0);

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef<number>(0);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proxy/notifications", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotifications(json.notifications || []);
        if (typeof json.unreadCount === "number") setUnreadCount(json.unreadCount);
        else setUnreadCount((json.notifications || []).filter((n: any) => !n.readAt).length);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetch("/api/proxy/notifications/unread-count", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && typeof json.count === "number") setUnreadCount(json.count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!active) return;
    setOpenedAt(Date.now());
    loadNotifications();
    loadUnreadCount();
  }, [active]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    if (!active) return;

    const connect = () => {
      if (typeof window === "undefined") return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${window.location.host}/api/ws/notifications`;
      socket = new WebSocket(url);

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg?.event !== "notification:new") return;
          const payload = msg?.data;
          const incoming = payload?.notification;
          if (incoming?.id) {
            setNotifications((prev) => [
              { ...(incoming as any), readAt: null } as NotificationEntry,
              ...prev.filter((n) => n.id !== incoming.id),
            ].slice(0, 20));
          }
          if (typeof payload?.unreadCount === "number") setUnreadCount(payload.unreadCount);
          else loadUnreadCount();
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        reconnectTimer = setTimeout(() => {
          loadUnreadCount();
          connect();
        }, 2000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [active]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      scrollTopRef.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!active) return;
    el.scrollTop = scrollTopRef.current;
  }, [active]);

  const badgeText = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  const markAllRead = async () => {
    await fetch("/api/proxy/notifications/read", { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await fetch("/api/proxy/notifications/clear", { method: "POST" }).catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    const res = await fetch(`/api/proxy/notifications/${id}/read`, { method: "POST" }).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    try {
      const json = res ? await (res as any).json().catch(() => ({})) : {};
      if (res && (res as any).ok && typeof json.unreadCount === "number") setUnreadCount(json.unreadCount);
      else loadUnreadCount();
    } catch {
      loadUnreadCount();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-2">
          <h5 className="text-lg font-semibold text-app">Notification Center</h5>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
              {badgeText}
            </span>
          ) : null}
        </div>
      </div>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar">
        {loading ? (
          <p className="px-3 py-2 text-sm text-app-muted">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-2 text-sm text-app-muted">No notifications yet.</p>
        ) : (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => markOneRead(item.id)}
              className={`rounded-lg border border-divider bg-app p-3 text-left transition hover:border-brand-200 ${
                item.readAt ? "opacity-80" : ""
              }`}
            >
              <NotificationTimelineEntry notification={item} nowKey={openedAt} variant="expanded" />
            </button>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={markAllRead}>
          Mark all as read
        </Button>
        <button
          type="button"
          onClick={clearAll}
          className="flex-1 rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm font-medium text-error-700 transition hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-50"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
