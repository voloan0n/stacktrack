"use client";

// =========================================================
// Imports
// =========================================================
import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/shared/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/shared/components/ui/dropdown/DropdownItem";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import { logoutClient } from "@/features/auth/lib/client";
import { GearIcon, LogoutIcon, UserCircleIcon } from "@/shared/icons";
import { useCloseOnOverlayOpen } from "@/shared/hooks/useCloseOnOverlayOpen";
import { dispatchOverlayOpen } from "@/shared/utils/overlayEvents";
import usePermissions from "@/shared/hooks/usePermissions";

// =========================================================
// Types
// =========================================================
type UserDropdownUser = {
  name?: string;
  role?: string;
  permissions?: string[];
  accentColor?: string;
  avatarColor?: string | null;
};

// =========================================================
// Component
// =========================================================
export default function UserDropdown({ user }: { user?: UserDropdownUser | null }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { can } = usePermissions(user?.permissions);

  useCloseOnOverlayOpen({
    source: "user-dropdown",
    enabled: isOpen,
    onClose: () => setIsOpen(false),
  });

  function toggleDropdown(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((prev) => {
      const next = !prev;
      if (next) dispatchOverlayOpen("user-dropdown");
      return next;
    });
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutClient();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user?.name || "StackTrack User";
  const roleLabel = user?.role || "User";
  const avatarColor = user?.accentColor || user?.avatarColor || "primary";

  return (
    <div className="relative">
      {/* Avatar trigger */}
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex h-11 w-11 items-center justify-center rounded-full border border-app bg-app text-app shadow-theme-xs transition hover:bg-app-subtle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        <UserIcon
          name={displayName}
          color={avatarColor}
          size="md"
          className="h-9 w-9 text-base"
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="mt-[13px] flex w-[260px] flex-col rounded-2xl border border-app bg-app p-3 shadow-theme-lg"
      >
        <div className="mb-3 border-b border-divider pb-3">
          <span className="block text-sm font-semibold text-app">{displayName}</span>
          <span className="mt-0.5 block text-xs text-app-muted">{roleLabel}</span>
        </div>

        {/* Links */}
        <ul className="flex flex-col gap-1 pb-3">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/settings/account"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-app transition hover:bg-app-subtle"
            >
              <UserCircleIcon className="text-app-muted" />
              Account settings
            </DropdownItem>
          </li>

          {can("settings.manage") ? (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/settings/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-app transition hover:bg-app-subtle"
              >
                <GearIcon className="text-app-muted" />
                Admin settings
              </DropdownItem>
            </li>
          ) : null}
        </ul>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-2 flex w-full items-center gap-3 rounded-lg border-t border-divider px-3 pt-3 pb-2 text-left text-sm font-semibold text-app transition hover:bg-app-subtle disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogoutIcon className="text-app-muted" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </Dropdown>
    </div>
  );
}
