type BadgeColor =
  | "neutral"
  | "light"
  | "dark"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "error";

export function getTicketStatusBadgeColor(status: string): BadgeColor {
  const normalized = (status || "").toLowerCase();
  if (normalized === "new") return "info";
  if (normalized === "in progress" || normalized === "in_progress") return "primary";
  if (normalized === "waiting_on_client" || normalized === "waiting on client") return "warning";
  if (normalized === "waiting_customer" || normalized === "waiting on customer") return "warning";
  if (normalized === "on_hold" || normalized === "on hold") return "warning";
  if (normalized === "resolved") return "success";
  if (normalized === "closed") return "light";
  if (normalized === "canceled" || normalized === "cancelled") return "error";
  return "info";
}

export function getTicketCategoryBadgeColor(category: string): BadgeColor {
  const lower = (category || "").toLowerCase();
  if (lower.includes("incident")) return "error";
  if (lower.includes("bug")) return "error";
  if (lower.includes("feature")) return "info";
  if (lower.includes("maintenance")) return "warning";
  if (lower.includes("support") || lower.includes("service")) return "primary";
  if (lower.includes("internal")) return "dark";
  return "info";
}

export function getTicketPriorityBadgeColor(priority: string): BadgeColor {
  const normalized = (priority || "").toLowerCase();
  if (normalized.includes("urgent")) return "error";
  if (normalized.includes("high")) return "warning";
  if (normalized.includes("medium")) return "info";
  if (normalized.includes("low")) return "neutral";
  return "neutral";
}
