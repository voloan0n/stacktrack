export const OVERLAY_OPEN_EVENT = "st:overlay-open";

export type OverlaySource = "user-dropdown" | "notification-dropdown" | "launchpad";

export type OverlayOpenEventDetail = {
  source: OverlaySource;
};

export type OverlayOpenEvent = CustomEvent<OverlayOpenEventDetail>;

export function dispatchOverlayOpen(source: OverlaySource) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OverlayOpenEventDetail>(OVERLAY_OPEN_EVENT, {
      detail: { source },
    })
  );
}

export function isOverlayOpenEvent(event: Event): event is OverlayOpenEvent {
  if (!(event instanceof CustomEvent)) return false;
  const detail = (event as CustomEvent).detail as Partial<OverlayOpenEventDetail> | undefined;
  return typeof detail?.source === "string";
}

