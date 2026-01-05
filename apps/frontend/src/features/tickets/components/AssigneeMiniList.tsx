"use client";

import React from "react";
import UserIcon from "@/shared/components/ui/avatar/UserIcon";

export type AssigneeReference = {
  id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  userName?: string;
  email?: string;
  avatarColor?: string | null;
  user?: AssigneeReference | null;
  isPrimary?: boolean;
  assignedAt?: string;
};

type AssigneeMiniListProps = {
  assignees?: Array<AssigneeReference | null | undefined>;
  maxVisible?: number;
  avatarSize?: "sm" | "md" | "lg";
  className?: string;
  avatarClassName?: string;
  emptyLabel?: string;
};

export default function AssigneeMiniList({
  assignees,
  maxVisible = Number.POSITIVE_INFINITY,
  avatarSize = "sm",
  className = "",
  avatarClassName = "border-2 border-white dark:border-gray-900",
  emptyLabel = "No user assigned",
}: AssigneeMiniListProps) {
  const normalized = React.useMemo(() => {
    if (!assignees?.length) return [];

    const flattened = assignees
      .map((entry) => {
        if (!entry) return null;
        const raw = (entry.user || entry) as AssigneeReference;
        const nameCandidate =
          raw.name ||
          raw.fullName ||
          [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() ||
          raw.username ||
          raw.userName ||
          raw.email ||
          raw.userId ||
          "";

        const normalizedName = nameCandidate || "User";
        const normalizedId =
          raw.id ||
          raw.userId ||
          raw.email ||
          normalizedName ||
          undefined;

        return {
          ...raw,
          id: normalizedId,
          name: normalizedName,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const deduped: AssigneeReference[] = [];
    const seen = new Set<string>();

    for (const person of flattened) {
      const key =
        person.id ||
        person.userId ||
        person.email ||
        person.name ||
        person.fullName ||
        person.username ||
        person.userName;
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(person);
    }

    return deduped;
  }, [assignees]);

  const resolvedMaxVisible = Number.isFinite(maxVisible)
    ? Math.max(1, Math.floor(maxVisible))
    : Number.POSITIVE_INFINITY;
  const visible = normalized.slice(0, resolvedMaxVisible);
  const containerClass = ["flex items-center gap-1", className]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (visible.length === 0) {
    return (
      <div className={containerClass}>
        <span className="text-xs text-gray-400 dark:text-gray-500">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {visible.map((person, index) => (
        <UserIcon
          key={person.id || person.email || person.name || `assignee-${index}`}
          name={person.name || "User"}
          color={person.avatarColor || "primary"}
          size={avatarSize}
          className={avatarClassName}
        />
      ))}
      {normalized.length > visible.length && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-semibold text-gray-600 dark:border-gray-900 dark:bg-gray-800 dark:text-gray-200">
          +{normalized.length - visible.length}
        </div>
      )}
    </div>
  );
}
