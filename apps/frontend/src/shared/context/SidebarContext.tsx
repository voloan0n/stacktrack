"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type SidebarState = "open" | "hidden";

type SidebarContextType = {
  state: SidebarState;
  setState: (state: SidebarState) => void;
  toggleHidden: () => void;
  isMobile: boolean;
  isLockedOpen: boolean;
  setLockedOpen: (locked: boolean) => void;
  toggleLockedOpen: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const useSidebarState = useSidebar;

function getStorageKey(userKey?: string) {
  const suffix = (userKey || "anonymous").trim() || "anonymous";
  return `stacktrack.sidebar.state:${suffix}`;
}

function getLockedStorageKey(userKey?: string) {
  const suffix = (userKey || "anonymous").trim() || "anonymous";
  return `stacktrack.sidebar.lockedOpen:${suffix}`;
}

// Keep this aligned with Tailwind's `lg` breakpoint (1024px) so layout + sidebar
// behavior stay consistent across the app.
const MOBILE_MAX_WIDTH = 1024;

export const SidebarProvider: React.FC<{ children: React.ReactNode; userKey?: string }> = ({
  children,
  userKey,
}) => {
  const [state, setStateInternal] = useState<SidebarState>("open");
  const [isLockedOpen, setIsLockedOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < MOBILE_MAX_WIDTH,
  );

  const storageKey = useMemo(() => getStorageKey(userKey), [userKey]);
  const lockedStorageKey = useMemo(() => getLockedStorageKey(userKey), [userKey]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_MAX_WIDTH;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "hidden") setStateInternal("hidden");
      else if (raw === "open" || raw === "pinned" || raw === "docked") setStateInternal("open");
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(lockedStorageKey);
      if (raw === null) return;
      setIsLockedOpen(raw === "true");
    } catch {
      // ignore
    }
  }, [lockedStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, state);
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(lockedStorageKey, String(isLockedOpen));
    } catch {
      // ignore
    }
  }, [isLockedOpen, lockedStorageKey]);

  const setState = useCallback((next: SidebarState) => {
    setStateInternal(next);
  }, []);

  const toggleHidden = useCallback(() => {
    setStateInternal((prev) => (prev === "hidden" ? "open" : "hidden"));
  }, []);

  const setLockedOpen = useCallback((locked: boolean) => setIsLockedOpen(locked), []);
  const toggleLockedOpen = useCallback(() => setIsLockedOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider
      value={{
        state,
        setState,
        toggleHidden,
        isMobile,
        isLockedOpen,
        setLockedOpen,
        toggleLockedOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
