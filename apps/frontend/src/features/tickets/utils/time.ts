export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "Unknown date";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "Unknown date";

  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatRelativeTime = (value?: string | Date | null) => {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "(just now)";
  if (diffHours === 1) return "(1 hr ago)";
  if (diffHours < 24) return `(${diffHours} hrs ago)`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "(1 day ago)";
  return `(${diffDays} days ago)`;
};

export const formatDuration = (minutes: number) =>
  minutes > 0
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
    : "0h 00m";

