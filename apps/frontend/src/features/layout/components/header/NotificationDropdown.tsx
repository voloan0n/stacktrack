"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dropdown } from "@/shared/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/shared/components/ui/dropdown/DropdownItem";
import NotificationTimelineEntry, {
  type NotificationEntry,
} from "@/shared/components/common/NotificationTimelineEntry";
import { useCloseOnOverlayOpen } from "@/shared/hooks/useCloseOnOverlayOpen";
import { dispatchOverlayOpen } from "@/shared/utils/overlayEvents";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useCloseOnOverlayOpen({
    source: "notification-dropdown",
    enabled: isOpen,
    onClose: () => setIsOpen(false),
  });

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proxy/notifications", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setNotifications(json.notifications || []);
        if (typeof json.unreadCount === "number") {
          setUnreadCount(json.unreadCount);
        } else {
          const count = (json.notifications || []).filter((n: NotificationEntry) => !n.readAt).length;
          setUnreadCount(count);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

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
    loadUnreadCount();
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

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
            setNotifications((prev) => {
              const next = [
                { ...(incoming as any), readAt: null } as NotificationEntry,
                ...prev.filter((n) => n.id !== incoming.id),
              ];
              return next.slice(0, 20);
            });
            if (isOpenRef.current) {
              loadNotifications();
            }
          }
          if (typeof payload?.unreadCount === "number") {
            setUnreadCount(payload.unreadCount);
          } else {
            loadUnreadCount();
          }
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
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/proxy/notifications/read", { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      const res = await fetch(`/api/proxy/notifications/${id}/read`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      if (res.ok && typeof json.unreadCount === "number") setUnreadCount(json.unreadCount);
      else loadUnreadCount();
    } catch {
      // ignore
    }
  };

  const clearAll = async () => {
    try {
      await fetch("/api/proxy/notifications/clear", { method: "POST" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        dispatchOverlayOpen("notification-dropdown");
        setOpenedAt(Date.now());
        loadNotifications();
        loadUnreadCount();
      }
      return next;
    });
  };

  const closeDropdown = () => setIsOpen(false);
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-app text-app-muted shadow-theme-xs transition hover:border-brand-200 hover:text-brand-600"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 z-10 min-w-[18px] rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
            {badgeText}
          </span>
        ) : null}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[200px] mt-[13px] flex h-[420px] w-[320px] flex-col rounded-2xl border border-app bg-app p-3 shadow-theme-lg sm:w-[320px] lg:right-0"
      >
        <div className="mb-3 flex items-center justify-between border-b border-divider pb-3">
          <h5 className="text-lg font-semibold text-app">Notifications</h5>
          <button
            onClick={toggleDropdown}
            className="dropdown-toggle text-app-muted transition hover:text-app"
            aria-label="Close notifications"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex h-[320px] flex-col gap-2 overflow-y-auto custom-scrollbar">
          {loading ? (
            <p className="px-3 py-2 text-sm text-app-muted">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-2 text-sm text-app-muted">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <DropdownItem
                key={item.id}
                onItemClick={async () => {
                  await markOneRead(item.id);
                  closeDropdown();
                }}
                baseClassName="block w-full text-left"
                className={`rounded-lg border border-divider bg-app p-3 transition hover:border-brand-200 ${
                  item.readAt ? "opacity-80" : ""
                }`}
              >
                <NotificationTimelineEntry notification={item} nowKey={openedAt} variant="compact" />
              </DropdownItem>
            ))
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={async () => {
              await markAllRead();
              await loadNotifications();
            }}
            className="flex-1 rounded-lg border border-app bg-app px-3 py-2 text-xs font-semibold text-app transition hover:bg-app-subtle"
          >
            Mark all as read
          </button>
          <button
            onClick={async () => {
              await clearAll();
            }}
            className="flex-1 rounded-lg border border-error-500 bg-error-50 px-3 py-2 text-xs font-semibold text-error-700 transition dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-50"
          >
            Clear all
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
