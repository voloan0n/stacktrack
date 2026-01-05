export function formatShortDate(value?: string | Date | null, empty = "—") {
  if (!value) return empty;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return empty;

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

