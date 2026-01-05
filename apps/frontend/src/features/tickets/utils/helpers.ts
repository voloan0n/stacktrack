export const normalizeStatus = (value?: string | null) =>
  (value || "In Progress").replace("-", " ");

export type BadgeColorKey =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

export const resolveBadgeColorFromAvatar = (
  raw?: string | null
): BadgeColorKey => {
  if (!raw) return "primary";
  const normalized = raw.trim().toLowerCase();
  const allowed: BadgeColorKey[] = [
    "primary",
    "success",
    "error",
    "warning",
    "info",
    "light",
    "dark",
  ];
  if ((allowed as string[]).includes(normalized)) {
    return normalized as BadgeColorKey;
  }
  return "primary";
};

export const isAssigneeActivity = (text?: string | null) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("assigned to") ||
    lower.includes("reassigned") ||
    lower.includes("assignee ")
  );
};

