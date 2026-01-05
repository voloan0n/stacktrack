import React from "react";
import Link from "next/link";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import { formatDateTime, formatRelativeTime } from "@/features/tickets/utils/time";

type NotificationActor = {
  id: string;
  name: string;
  email?: string | null;
  accentColor?: string | null;
  image?: string | null;
};

export type NotificationEntry = {
  id: string;
  type?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  actor?: NotificationActor | null;
  entityType?: string | null;
  entityId?: string | null;
  ticketNumber?: number | null;
};

export default function NotificationTimelineEntry({
  notification,
  nowKey,
  variant = "compact",
}: {
  notification: NotificationEntry;
  nowKey?: number;
  variant?: "compact" | "expanded";
}) {
  const nowMs = typeof nowKey === "number" && nowKey > 0 ? nowKey : Date.now();
  const actorName = notification.actor?.name || "StackTrack";
  const actorColor = notification.actor?.accentColor || "primary";
  const createdAt = notification.createdAt || new Date().toISOString();
  const createdAtMs = Date.parse(createdAt);
  const date = Number.isNaN(createdAtMs) ? new Date() : new Date(createdAtMs);

  const eyebrowText =
    typeof notification.ticketNumber === "number"
      ? `Ticket #${notification.ticketNumber}`
      : "Ticket";

  const ticketHref =
    notification.entityType === "ticket" && notification.entityId
      ? `/tickets/${notification.entityId}`
      : null;

  const relative = (() => {
    const raw = formatRelativeTime(date);
    if (!raw || raw === "(just now)") return "";
    return raw;
  })();

  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const diffHours = Math.floor((nowMs - date.getTime()) / (1000 * 60 * 60));

  const compactTimestamp =
    diffHours < 24
      ? `${timeLabel}${relative ? ` ${relative}` : ""}`
      : date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

  const expandedTimestamp = (() => {
    const dateLabel = date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${dateLabel} · ${timeLabel}${relative ? ` ${relative}` : ""}`;
  })();

  const timestampText = variant === "expanded" ? expandedTimestamp : compactTimestamp;

  return (
    <div className="flex w-full items-center gap-3">
      <UserIcon
        name={actorName}
        color={actorColor}
        size="sm"
        className="h-9 w-9 shrink-0 text-[12px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {ticketHref ? (
              <Link
                href={ticketHref}
                className="shrink-0 uppercase tracking-[0.2em] text-[var(--color-semantic-primary-fg)] no-underline hover:opacity-90"
              >
                {eyebrowText}
              </Link>
            ) : (
              <span className="shrink-0 uppercase tracking-[0.2em] text-[var(--color-semantic-primary-fg)]">
                {eyebrowText}
              </span>
            )}
            <span aria-hidden="true" className="shrink-0 text-app-muted">
              ·
            </span>
          </div>

          <span
            className="min-w-0 truncate text-right text-[11px] text-app-muted"
            title={formatDateTime(date)}
          >
            {timestampText}
          </span>
        </div>

        <p className="mt-1 truncate text-sm font-semibold text-app">
          {notification.title || "Notification"}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-app-muted">
          {notification.body}
        </p>
      </div>
    </div>
  );
}
