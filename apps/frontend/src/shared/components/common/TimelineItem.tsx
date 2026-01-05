import React from "react";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";
import {
  formatDateTime,
  formatRelativeTime,
} from "@/features/tickets/utils/time";

type TimelineEntryBase = {
  id: string;
  createdAt: string | null;
  body: string;
  kind: "note" | "activity" | "divider";
};

type TimelineEntryWithAuthor = TimelineEntryBase & {
  name: string;
  email?: string;
  roleLabel?: string | null;
  avatarColor?: string;
};

export type TimelineEntry =
  | (TimelineEntryWithAuthor & {
      kind: "note";
      supportType?: string | null;
      durationMin?: number | null;
      billable?: string | null;
      internal?: boolean | null;
      type?: "note";
      timeTrackingId?: string | null;
    })
  | (TimelineEntryWithAuthor & {
      kind: "activity";
      type?: "status" | "assignee" | "transfer";
    })
  | (TimelineEntryBase & {
      kind: "divider";
      type?: "status" | "assignee" | "transfer";
    });

export interface TimelineItemProps {
  item: TimelineEntry;
  children?: React.ReactNode;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ item, children }) => {
  if (item.kind === "divider") {
    return (
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-app-muted">
          {item.body}
        </p>
        <span className="whitespace-nowrap text-xs text-app-muted">
          {formatDateTime(item.createdAt || undefined)}
        </span>
      </div>
    );
  }

  const isInternalNote = item.kind === "note" && item.internal === true;
  const containerClass = isInternalNote
    ? "flex gap-3 rounded-xl border border-dashed border-app bg-[linear-gradient(45deg,rgba(120,120,120,0.08)_25%,transparent_25%,transparent_50%,rgba(120,120,120,0.08)_50%,rgba(120,120,120,0.08)_75%,transparent_75%,transparent)] bg-[length:14px_14px] px-4 py-3 text-sm text-app shadow-theme-xs dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.06)_75%,transparent_75%,transparent)]"
    : "flex gap-3 rounded-xl border border-app bg-app px-4 py-3 text-sm text-app shadow-theme-xs";

  return (
    <div className={containerClass}>
      <UserIcon
        name={item.name}
        color={item.avatarColor || "primary"}
        size="lg"
      />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-app">{item.name}</p>
            {item.kind === "note" && item.roleLabel ? (
              <p className="text-xs text-app-muted">{item.roleLabel}</p>
            ) : null}
          </div>
          <span className="text-xs text-app-muted">
            {formatDateTime(item.createdAt || undefined)}{" "}
            <span className="ml-1">
              {formatRelativeTime(item.createdAt || undefined)}
            </span>
          </span>
        </div>

        <p className="whitespace-pre-line text-sm text-app">{item.body}</p>

        {children}
      </div>
    </div>
  );
};

export default TimelineItem;
