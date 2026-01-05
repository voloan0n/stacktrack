export const NOTIFICATION_PLACEHOLDERS = [
  "ticketNumber",
  "ticketSubject",
  "requesterName",
  "authorName",
  "oldStatus",
  "newStatus",
  "notePreview",
] as const;

export type NotificationPlaceholder = (typeof NOTIFICATION_PLACEHOLDERS)[number];

export type NotificationTemplateVariant = "short" | "long";

export type NotificationTemplateType =
  | "ticket.created"
  | "ticket.assigned"
  | "ticket.status.updated"
  | "ticket.note.created";

export type PlaceholderContext = Partial<Record<NotificationPlaceholder, string | null | undefined>> & {
  [key: string]: string | null | undefined;
};

const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function extractPlaceholders(template: string) {
  const found = new Set<string>();
  if (!template) return found;
  for (const match of template.matchAll(PLACEHOLDER_REGEX)) {
    if (match[1]) found.add(match[1]);
  }
  return found;
}

export function validateTemplateFields(input: {
  titleTemplate: string;
  bodyTemplate: string;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.titleTemplate || !input.titleTemplate.trim()) {
    errors.push("Title template cannot be empty.");
  }

  const all = [input.titleTemplate, input.bodyTemplate].join("\n");
  const used = extractPlaceholders(all);
  const unknown = Array.from(used).filter(
    (token) => !NOTIFICATION_PLACEHOLDERS.includes(token as any)
  );
  if (unknown.length) {
    warnings.push(`Unknown placeholders: ${unknown.join(", ")}`);
  }

  return { errors, warnings, usedPlaceholders: Array.from(used) };
}

export function renderTemplate(template: string, context: PlaceholderContext) {
  if (!template) return "";
  return template.replace(PLACEHOLDER_REGEX, (_full, key: string) => {
    const raw = context?.[key];
    if (raw === null || raw === undefined) return "";
    return String(raw);
  });
}

export function sanitizePreviewText(text: string, maxLen = 120) {
  const normalized = String(text || "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
