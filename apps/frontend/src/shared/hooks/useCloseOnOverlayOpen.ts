"use client";

import { useEffect } from "react";
import {
  isOverlayOpenEvent,
  OVERLAY_OPEN_EVENT,
  type OverlaySource,
} from "@/shared/utils/overlayEvents";

export function useCloseOnOverlayOpen({
  source,
  onClose,
  enabled = true,
}: {
  source: OverlaySource;
  onClose: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      if (!isOverlayOpenEvent(event)) return;
      if (event.detail.source === source) return;
      onClose();
    };

    window.addEventListener(OVERLAY_OPEN_EVENT, handler);
    return () => window.removeEventListener(OVERLAY_OPEN_EVENT, handler);
  }, [enabled, onClose, source]);
}

