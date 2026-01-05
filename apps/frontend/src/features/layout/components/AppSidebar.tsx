"use client";

// =========================================================
// Imports
// =========================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/shared/context/SidebarContext";
import { useAuth } from "@/features/auth/lib/provider";
import { GearIcon, ListIcon, LockIcon, PinIcon, PinOffIcon, UserCircleIcon } from "@/shared/icons";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Types + Data
// =========================================================
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Support Tickets",
    path: "/tickets",
  },
  {
    icon: <UserCircleIcon />,
    name: "Clients",
    path: "/clients",
  },
];

const AppSidebar: React.FC = () => {
  const { state, isMobile, isLockedOpen, toggleLockedOpen } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuth() || { user: null };

  const isActive = useCallback((path: string) => path === pathname, [pathname]);
  const isSettingsActive = isActive("/settings/account") || (pathname?.startsWith("/settings") ?? false);

  const { permissions, hasWildcard, can } = usePermissions(user?.permissions);

  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current === null) return;
    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  }, []);

  const canHoverExpand = !isMobile && !isLockedOpen;
  const isExpandedVisual = isMobile || isLockedOpen || isHoverExpanded;
  const isCollapsed = !isExpandedVisual;

  useEffect(() => {
    if (!canHoverExpand) {
      setIsHoverExpanded(false);
    }
  }, [canHoverExpand]);

  useEffect(() => {
    return () => clearHoverTimer();
  }, [clearHoverTimer]);

  const linkClassName = (active: boolean) =>
    [
      "group flex items-center rounded-xl text-sm font-medium transition-colors",
      isCollapsed ? "justify-center px-2 py-2" : "justify-start gap-3 px-3 py-2",
      active
        ? "bg-app-subtle text-app"
        : "text-app-muted hover:bg-app-subtle/70 hover:text-app",
    ].join(" ");

  const iconClassName = (active: boolean) =>
    [
      "flex h-9 w-9 items-center justify-center rounded-xl border",
      active
        ? "border-divider bg-app text-brand-600"
        : "border-transparent bg-app-subtle/70 text-app-muted group-hover:border-divider group-hover:bg-app group-hover:text-app",
    ].join(" ");

  if (state === "hidden") return null;

  return (
    <aside
      id="app-sidebar"
      className={`fixed left-0 top-[128px] z-50 flex h-[calc(100vh-128px)] flex-col border-r border-app bg-app shadow-theme-lg lg:top-[72px] lg:h-[calc(100vh-72px)] transition-[width] duration-200 ease-in-out ${
        isExpandedVisual ? "w-[264px]" : "w-[76px]"
      }`}
      data-sidebar-state={state}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        if (!canHoverExpand) return;
        clearHoverTimer();
        hoverTimerRef.current = window.setTimeout(() => {
          setIsHoverExpanded(true);
          hoverTimerRef.current = null;
        }, 140);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        if (!canHoverExpand) return;
        clearHoverTimer();
        setIsHoverExpanded(false);
      }}
      onFocusCapture={() => {
        if (!canHoverExpand) return;
        clearHoverTimer();
        setIsHoverExpanded(true);
      }}
      onBlurCapture={(event) => {
        if (!canHoverExpand) return;
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        clearHoverTimer();
        setIsHoverExpanded(false);
      }}
    >
      <div className={`border-b border-divider pt-4 pb-4 ${isExpandedVisual ? "px-4" : "px-2"}`}>
        <div className={`flex items-center ${isExpandedVisual ? "justify-between" : "justify-center"}`}>
          <div className={`flex items-center ${isExpandedVisual ? "gap-3" : ""}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-xs font-semibold text-white shadow-sm">
              ST
            </div>
            {isExpandedVisual ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-app">StackTrack</div>
                <div className="truncate text-xs text-app-muted">Dashboard</div>
              </div>
            ) : null}
          </div>
          {!isMobile && isExpandedVisual ? (
            <button
              type="button"
              onClick={() => {
                setIsHoverExpanded(false);
                toggleLockedOpen();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-app bg-app text-app-muted shadow-theme-xs transition hover:bg-app-subtle"
              aria-label={isLockedOpen ? "Unlock sidebar" : "Lock sidebar open"}
              aria-pressed={isLockedOpen}
              title={isLockedOpen ? "Unlock sidebar" : "Lock sidebar open"}
            >
              {isLockedOpen ? <PinOffIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex flex-1 flex-col overflow-y-auto pt-4 pb-4 no-scrollbar ${isCollapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-6">
          <section>
            <h2 className="sr-only">Main</h2>
            <h2
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted px-2 ${
                isExpandedVisual ? "" : "hidden"
              }`}
            >
              Main
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {navItems
                .filter((item) => {
                  if (!permissions.length) return false;
                  if (hasWildcard) return true;
                  if (item.path === "/tickets") return can("ticket.view");
                  if (item.path === "/clients") return can("client.view");
                  return true;
                })
                .map((item) => {
                  const active = item.path ? isActive(item.path) : false;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.path || "#"}
                        className={linkClassName(active)}
                        aria-current={active ? "page" : undefined}
                        title={!isExpandedVisual ? item.name : undefined}
                      >
                        <span className={iconClassName(active)} aria-hidden="true">
                          {item.icon}
                        </span>
                        {!isExpandedVisual ? (
                          <>
                            <span className="sr-only">{item.name}</span>
                          </>
                        ) : (
                          <span className="truncate">{item.name}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        </nav>
      </div>

      {/* Footer actions */}
      <div className={`border-t border-divider pt-4 pb-5 ${isCollapsed ? "px-2" : "px-3"}`}>
        <Link
          href="/settings/account"
          className={linkClassName(isSettingsActive)}
          aria-current={isSettingsActive ? "page" : undefined}
          title={!isExpandedVisual ? "Settings" : undefined}
        >
          <span
            className={iconClassName(isSettingsActive)}
            aria-hidden="true"
          >
            <GearIcon className="h-4 w-4" />
          </span>
          {!isExpandedVisual ? (
            <>
              <span className="sr-only">Settings</span>
            </>
          ) : (
            <span>Settings</span>
          )}
        </Link>

        <Link
          href="/logout"
          className={linkClassName(false)}
          title={!isExpandedVisual ? "Logout" : undefined}
        >
          <span className={iconClassName(false)} aria-hidden="true">
            <LockIcon className="h-4 w-4" />
          </span>
          {!isExpandedVisual ? (
            <>
              <span className="sr-only">Logout</span>
            </>
          ) : (
            <span>Logout</span>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
