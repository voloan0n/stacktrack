"use client";

// =========================================================
// Imports
// =========================================================
import NotificationDropdown from "@/features/layout/components/header/NotificationDropdown";
import LaunchpadNotificationCenter from "@/features/layout/components/header/LaunchpadNotificationCenter";
import UserDropdown from "@/features/layout/components/header/UserDropdown";
import { useAuth } from "@/features/auth/lib/provider";
import { useLaunchpad } from "@/features/search/GlobalSearchProvider";
import Input from "@/shared/components/form/input/InputField";
import BrandBackground from "@/shared/components/common/BrandBackground";
import { useSidebar } from "@/shared/context/SidebarContext";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CloseIcon, GearIcon, ListIcon, LockIcon, SearchIcon, UserCircleIcon } from "@/shared/icons";
import { dispatchOverlayOpen } from "@/shared/utils/overlayEvents";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Types
// =========================================================
interface AppHeaderProps {
  user?: {
    name?: string;
    email?: string;
    image?: string;
    avatarColor?: string | null;
    notify_ticket_assigned?: boolean;
    notify_ticket_status_changed?: boolean;
    notify_ticket_comments?: boolean;
    notificationsEnabled?: boolean;
  };
}

// =========================================================
// Component
// =========================================================
const AppHeader = ({ user }: AppHeaderProps) => {
  const { state, isMobile, toggleHidden } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser } = useAuth() || { user: null };
  const { can } = usePermissions(authUser?.permissions);
  const canViewTickets = can("ticket.view");
  const canViewClients = can("client.view");
  const {
    open,
    close,
    isOpen,
    isLaunchpadOpen,
    query,
    setQuery,
    handleSearchKeyDown,
    registerSearchInput,
    focusSearchInput,
    items,
    grouped,
    indexById,
    activeIndex,
    loading,
    navigateTo,
  } = useLaunchpad();

  const ignoreNextSearchFocusRef = useRef(false);

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    const platform = String((navigator as any).userAgentData?.platform || navigator.platform || "");
    const isApple = /Mac|iPhone|iPad|iPod/i.test(platform);
    return isApple ? "⌘ K" : "Ctrl K";
  }, []);

  useEffect(() => {
    if (!isLaunchpadOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isLaunchpadOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const metaOrCtrl = event.metaKey || event.ctrlKey;
      if (!metaOrCtrl || key !== "k") return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        (target as any)?.isContentEditable ||
        tag === "select";
      if (isEditable) return;

      event.preventDefault();
      dispatchOverlayOpen("launchpad");
      setQuery("");
      ignoreNextSearchFocusRef.current = true;
      open({ mode: "launchpad" });
      focusSearchInput({ select: true });
      window.setTimeout(() => {
        ignoreNextSearchFocusRef.current = false;
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearchInput, open, setQuery]);

  const handleToggle = () => {
    toggleHidden();
  };

  const wantsNotifications = user?.notificationsEnabled ?? true;
  const hasQuery = query.trim().length > 0;
  const showDefaultPanels = isLaunchpadOpen && !hasQuery;

  const SearchResultsDropdown = () => {
    const groupOrder = ["settings", "tickets", "clients", "actions"] as const;
    const titleByGroup: Record<(typeof groupOrder)[number], string> = {
      settings: "Settings",
      tickets: "Tickets",
      clients: "Clients",
      actions: "Quick Actions",
    };

    return (
      <div
        className="absolute left-0 right-0 z-50 mt-6 overflow-hidden rounded-2xl border border-app bg-app shadow-theme-lg lg:mt-8"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="max-h-[420px] overflow-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-sm text-app-muted">No results.</div>
          ) : (
            <div className="divide-y divide-divider">
              {groupOrder.map((key) => {
                const list = grouped[key];
                if (!list.length) return null;

                return (
                  <div key={key} className="py-2">
                    <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                      {titleByGroup[key]}
                    </div>
                    <div className="space-y-1 px-1">
                      {list.map((item) => {
                        const idx = indexById.get(item.id) ?? -1;
                        const active = idx === activeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigateTo(item.href)}
                            className={`flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition ${
                              active ? "bg-app-subtle" : "hover:bg-app-subtle"
                            }`}
                          >
                            <div className="min-w-0">
                              {item.eyebrow ? (
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-muted">
                                  {item.eyebrow}
                                </div>
                              ) : null}
                              <div className="truncate text-sm font-semibold text-app">{item.title}</div>
                              {item.subtitle ? (
                                <div className="mt-0.5 truncate text-xs text-app-muted">
                                  {item.subtitle}
                                </div>
                              ) : null}
                            </div>
                            <span className="mt-0.5 shrink-0 rounded-lg border border-app bg-app px-2 py-1 text-[11px] text-app-muted">
                              ↵
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-divider bg-app-subtle px-4 py-2 text-xs text-app-muted">
          {loading ? "Searching…" : "Tip: Use ↑ ↓ Enter to open"}
        </div>
      </div>
    );
  };

  return (
    <>
      {isLaunchpadOpen ? (
        <div
          className="fixed inset-0 z-[99990] overflow-hidden bg-app transition-opacity"
          onMouseDown={() => close()}
          aria-hidden="true"
        >
          <BrandBackground />
        </div>
      ) : null}

      <header
        id="app-header"
        className="fixed top-0 left-0 right-0 z-[99999] border-b border-app bg-app/80 backdrop-blur supports-[backdrop-filter]:bg-app-subtle/90"
      >
        <div className="relative z-50 flex h-[72px] items-center justify-between px-3 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-app bg-app text-app shadow-theme-xs transition hover:border-brand-200 hover:text-brand-600"
              onClick={handleToggle}
              aria-label="Toggle Sidebar"
              aria-pressed={state === "open"}
            >
              {state === "open" && isMobile ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.22 7.28a.75.75 0 0 1 1.06 0L12 11.94l4.72-4.72a.75.75 0 0 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="12"
                  viewBox="0 0 16 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.583 1a.75.75 0 0 1 .75-.75h12.334a.75.75 0 1 1 0 1.5H1.333A.75.75 0 0 1 0.583 1Zm0 10a.75.75 0 0 1 .75-.75h12.334a.75.75 0 1 1 0 1.5H1.333A.75.75 0 0 1 0.583 11Zm0-5a.75.75 0 0 1 .75-.75h6.667a.75.75 0 1 1 0 1.5H1.333A.75.75 0 0 1 0.583 6Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </div>

        {/* Centered Search (desktop) */}
        <div className="absolute left-1/2 hidden w-full max-w-3xl -translate-x-1/2 lg:block">
          <div className="relative">
            <Input
              data-global-search-input
              ref={registerSearchInput}
              value={query}
              onChange={(e) => {
                if (!isOpen) open({ mode: "search" });
                setQuery(e.target.value);
              }}
              onFocus={() => {
                if (ignoreNextSearchFocusRef.current) {
                  ignoreNextSearchFocusRef.current = false;
                  return;
                }
                open({ mode: "search" });
              }}
              onBlur={() => {
                if (!isLaunchpadOpen) close();
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search…"
              className="h-11 !rounded-full border !border-app !bg-app-subtle py-2.5 pl-12 pr-32 text-sm !text-app shadow-theme-sm placeholder:text-app-muted focus:!border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/15"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
              <SearchIcon className="h-5 w-5 fill-current text-app opacity-70" aria-hidden="true" />
            </span>
            {hasQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-20 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-transparent text-app-muted transition hover:border-app hover:bg-app hover:text-app"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  setQuery("");
                  focusSearchInput();
                }}
              >
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-app bg-app px-3 py-1 text-xs font-medium tracking-[0.12em] text-app-muted">
              {shortcutLabel}
            </span>
            {isOpen && hasQuery ? <SearchResultsDropdown /> : null}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {wantsNotifications ? <NotificationDropdown /> : null}
          <UserDropdown user={user} />
        </div>
      </div>

      {/* Mobile search */}
      <div className="relative z-50 px-3 pb-3 lg:hidden">
        <div className="relative">
          <Input
            data-global-search-input
            ref={registerSearchInput}
            value={query}
            onChange={(e) => {
              if (!isOpen) open({ mode: "search" });
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (ignoreNextSearchFocusRef.current) {
                ignoreNextSearchFocusRef.current = false;
                return;
              }
              open({ mode: "search" });
            }}
            onBlur={() => {
              if (!isLaunchpadOpen) close();
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search…"
            className="h-11 w-full !rounded-full border !border-app !bg-app-subtle py-2.5 pl-10 pr-10 text-sm !text-app shadow-theme-sm placeholder:text-app-muted focus:!border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
            <SearchIcon className="h-[18px] w-[18px] fill-current text-app opacity-70" aria-hidden="true" />
          </span>
          {hasQuery ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-transparent text-app-muted transition hover:border-app hover:bg-app hover:text-app"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                setQuery("");
                focusSearchInput();
              }}
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          {isOpen && hasQuery ? <SearchResultsDropdown /> : null}
        </div>
      </div>
      </header>

      {isLaunchpadOpen ? (
        <div
          className={`fixed inset-0 z-[99995] flex items-center justify-center px-4 transition-opacity ${
            showDefaultPanels ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="flex w-full max-w-6xl items-center justify-center gap-6">
            <div className="pointer-events-auto flex h-[520px] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-app bg-app p-4 shadow-theme-lg">
              <div className="mb-3 border-b border-divider pb-3">
                <h5 className="text-lg font-semibold text-app">Quick Actions</h5>
                <p className="mt-1 text-xs text-app-muted">Jump to common tasks.</p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                {(grouped.actions || []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.href)}
                    className="flex w-full items-start justify-between gap-4 rounded-xl border border-divider bg-app px-4 py-3 text-left transition hover:bg-app-subtle"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-app">{item.title}</div>
                      {item.subtitle ? (
                        <div className="mt-1 truncate text-xs text-app-muted">
                          {item.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <span className="mt-0.5 shrink-0 rounded-lg border border-app bg-app px-2 py-1 text-[11px] text-app-muted">
                      ↵
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto h-[520px] w-full max-w-[520px] overflow-hidden rounded-2xl border border-app bg-app p-4 shadow-theme-lg">
              <LaunchpadNotificationCenter active={showDefaultPanels} />
            </div>
          </div>
        </div>
      ) : null}

      {isLaunchpadOpen ? (
        <div
          className="fixed bottom-6 left-1/2 z-[100000] -translate-x-1/2"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <nav
            aria-label="Global search dock"
            className="flex items-center gap-1 overflow-hidden rounded-2xl border border-app bg-app p-2 shadow-theme-lg"
          >
            {canViewTickets ? (
              <button
                type="button"
                onClick={() => navigateTo("/tickets")}
                className={`flex h-14 items-center gap-2 rounded-xl px-5 text-sm font-medium transition hover:bg-app-subtle ${
                  pathname === "/tickets" ? "text-brand-600" : "text-app"
                }`}
                aria-label="Tickets"
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  <ListIcon />
                </span>
                <span className="hidden sm:inline">Tickets</span>
              </button>
            ) : null}

            {canViewTickets && canViewClients ? <div className="h-6 w-px bg-divider" /> : null}

            {canViewClients ? (
              <button
                type="button"
                onClick={() => navigateTo("/clients")}
                className={`flex h-14 items-center gap-2 rounded-xl px-5 text-sm font-medium transition hover:bg-app-subtle ${
                  pathname === "/clients" ? "text-brand-600" : "text-app"
                }`}
                aria-label="Clients"
              >
                <span className="flex h-6 w-6 items-center justify-center">
                  <UserCircleIcon />
                </span>
                <span className="hidden sm:inline">Clients</span>
              </button>
            ) : null}

            {(canViewTickets || canViewClients) ? <div className="h-6 w-px bg-divider" /> : null}

            <button
              type="button"
              onClick={() => navigateTo("/settings/account")}
              className={`flex h-14 items-center gap-2 rounded-xl px-5 text-sm font-medium transition hover:bg-app-subtle ${
                pathname?.startsWith("/settings") ? "text-brand-600" : "text-app"
              }`}
              aria-label="Settings"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <GearIcon className="h-5 w-5" />
              </span>
              <span className="hidden sm:inline">Settings</span>
            </button>

            <div className="h-6 w-px bg-divider" />

            <button
              type="button"
              onClick={async () => {
                close();
                try {
                  await fetch("/api/proxy/auth/logout", { method: "GET", credentials: "include" });
                } finally {
                  router.replace("/login");
                }
              }}
              className="flex h-14 items-center gap-2 rounded-xl px-5 text-sm font-medium text-app transition hover:bg-app-subtle"
              aria-label="Logout"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <LockIcon className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </nav>
        </div>
      ) : null}
    </>
  );
};

export default AppHeader;
