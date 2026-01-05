"use client";

import React from "react";
import { AlertIcon, CheckCircleIcon, ErrorIcon } from "@/shared/icons";

interface TicketMetricItem {
  status: string;
  dueDate?: string | null;

  // TODO: extend with fields required for visibility logic
  // isInternal?: boolean;
  // canUserView?: boolean;
}

interface Props {
  /**
   * Tickets passed into this component should already be filtered
   * using the same rules as the table below (permissions, visibility, etc.)
   *
   * TODO:
   * Wire this to the same filtered dataset used by the tickets table.
   */
  tickets?: TicketMetricItem[];
}

type MetricTone = "info" | "warning" | "error";

export default function TicketMetrics({ tickets = [] }: Props) {
  /**
   * TODO:
   * Centralize these status constants with the table filtering logic
   */
  const CLOSED_STATUS = "closed";
  const REQUIRES_ACTION_STATUSES = [
    "waiting_on_client",
    "waiting_on_billing",
  ];

  /**
   * Metrics (derived only from visible tickets)
   */
  const openTickets = tickets.filter(
    (t) => t.status !== CLOSED_STATUS
  ).length;

  const requiresAction = tickets.filter((t) =>
    REQUIRES_ACTION_STATUSES.includes(t.status)
  ).length;

  /**
   * TODO:
   * Implement overdue logic once backend provides:
   * - due dates
   * - SLA rules
   * - timezone handling
   */
  const overdueTickets = 0;

  const metrics: Array<{
    id: number;
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: MetricTone;
  }> = [
    {
      id: 1,
      label: "Open Tickets",
      value: openTickets,
      icon: <CheckCircleIcon className="h-5 w-5" />,
      tone: "info",
    },
    {
      id: 2,
      label: "Requires Action",
      value: requiresAction,
      icon: <AlertIcon className="h-5 w-5" />,
      tone: "warning",
    },
    {
      id: 3,
      label: "Overdue Tickets",
      value: overdueTickets,
      icon: <ErrorIcon className="h-5 w-5" />,
      tone: "error",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="flex items-center gap-5 rounded-2xl border border-app bg-app-subtle p-5 shadow-theme-sm"
        >
          {/* Icon container (semantic, badge-driven) */}
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: `var(--badge-${metric.tone}-bg)`,
              color: `var(--badge-${metric.tone}-text)`,
              borderColor: `color-mix(
                in srgb,
                var(--badge-${metric.tone}-text) 20%,
                transparent
              )`,
            }}
          >
            {metric.icon}
          </div>

          {/* Metric text */}
          <div className="flex flex-col gap-0.5">
            <h3
              className="text-2xl font-semibold"
              style={{
                color: `var(--badge-${metric.tone}-text)`,
              }}
            >
              {metric.value}
            </h3>
            <p className="text-sm font-medium text-app-muted">
              {metric.label}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
