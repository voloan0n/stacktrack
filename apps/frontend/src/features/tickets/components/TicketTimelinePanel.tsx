"use client";

import React, { useEffect, useMemo, useState } from "react";
import TimelineItem, { TimelineEntry } from "@/shared/components/common/TimelineItem";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import Badge from "@/shared/components/ui/badge/Badge";
import { formatDuration } from "@/features/tickets/utils/time";

type TicketTimelinePanelProps = {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  entries: TimelineEntry[];
  pageSize?: number;
  countKind?: TimelineEntry["kind"];
  headerRight?: React.ReactNode;
  className?: string;
  emptyText?: string;
};

export function TicketTimelineEntry({ item }: { item: TimelineEntry }) {
  if (item.kind !== "note") {
    return <TimelineItem item={item} />;
  }

  const billableBadge =
    item.billable === "billable"
      ? { label: "Billable", color: "success" as const }
      : item.billable === "non_billable"
        ? { label: "Non Billable", color: "light" as const }
        : item.billable === "need_review"
          ? { label: "Need Review", color: "warning" as const }
          : null;

  const supportLabel = item.supportType
    ? item.supportType
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const durationLabel =
    typeof item.durationMin === "number" && item.durationMin > 0
      ? formatDuration(item.durationMin)
      : null;

  const hasMetaBadges = Boolean(supportLabel || billableBadge || durationLabel);

  return (
    <TimelineItem item={item}>
      {hasMetaBadges ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {supportLabel ? (
            <Badge size="sm" color="info">
              {supportLabel}
            </Badge>
          ) : null}
          {billableBadge ? (
            <Badge size="sm" color={billableBadge.color}>
              {billableBadge.label}
            </Badge>
          ) : null}
          {durationLabel ? (
            <Badge size="sm" color="primary">
              {durationLabel}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </TimelineItem>
  );
}

export default function TicketTimelinePanel({
  eyebrow,
  title,
  description,
  entries,
  pageSize = 5,
  countKind,
  headerRight,
  className = "",
  emptyText = "Nothing here yet.",
}: TicketTimelinePanelProps) {
  const eligibleCount = countKind
    ? entries.filter((entry) => entry.kind === countKind).length
    : entries.length;
  const totalPages = Math.max(1, Math.ceil(eligibleCount / pageSize));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [entries, pageSize]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pageEntries = useMemo(() => {
    if (!countKind) {
      const startIndex = (currentPage - 1) * pageSize;
      return entries.slice(startIndex, startIndex + pageSize);
    }

    const startEligible = (currentPage - 1) * pageSize;
    const endEligible = startEligible + pageSize;
    const result: TimelineEntry[] = [];

    let eligibleIndex = 0;
    for (const item of entries) {
      if (eligibleIndex >= endEligible) break;

      if (item.kind === countKind) {
        if (eligibleIndex >= startEligible && eligibleIndex < endEligible) {
          result.push(item);
        }
        eligibleIndex += 1;
        continue;
      }

      if (eligibleIndex >= startEligible && eligibleIndex < endEligible) {
        result.push(item);
      }
    }

    return result;
  }, [countKind, currentPage, entries, pageSize]);

  return (
    <section
      className={`flex h-[420px] max-h-[60vh] flex-col overflow-hidden rounded-xl border border-app bg-app text-sm text-app shadow-theme-xs ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
            {eyebrow}
          </p>
          <h4 className="text-sm font-semibold text-app">{title}</h4>
          {description ? (
            <p className="text-xs text-app-muted">{description}</p>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
          {headerRight}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {pageEntries.length ? (
          <div className="space-y-3">
            {pageEntries.map((item) => (
              <TicketTimelineEntry key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-app-muted">{emptyText}</p>
        )}
      </div>

      {totalPages > 1 ? (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={eligibleCount}
          pageSize={pageSize}
          onPageChange={(page) =>
            setCurrentPage(Math.min(totalPages, Math.max(1, page)))
          }
          size="sm"
        />
      ) : null}
    </section>
  );
}
