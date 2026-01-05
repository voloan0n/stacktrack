import { prisma } from "../../config/prisma";
import type { NotificationTemplateVariant, NotificationTemplateType, PlaceholderContext } from "./templateRenderer";
import { renderTemplate, sanitizePreviewText } from "./templateRenderer";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "./defaultTemplates";

type CachedTemplate = {
  value: {
    id: string;
    type: string;
    variant: string;
    titleTemplate: string;
    bodyTemplate: string;
  } | null;
  expiresAt: number;
};

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CachedTemplate>();
let defaultsEnsured = false;

function cacheKey(type: string, variant: string) {
  return `${type}::${variant}`;
}

export async function getEnabledNotificationTemplate(params: {
  type: NotificationTemplateType;
  variant: NotificationTemplateVariant;
}) {
  if (!defaultsEnsured) {
    await ensureDefaultNotificationTemplates();
  }

  const key = cacheKey(params.type, params.variant);
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) return existing.value;

  const template = await prisma.notificationTemplate.findUnique({
    where: { type_variant: { type: params.type, variant: params.variant } },
    select: {
      id: true,
      type: true,
      variant: true,
      titleTemplate: true,
      bodyTemplate: true,
    },
  });

  const value = template ? template : null;
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export function bustTemplateCache(type?: string) {
  if (!type) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${type}::`)) cache.delete(key);
  }
}

export async function ensureDefaultNotificationTemplates() {
  if (defaultsEnsured) return;
  defaultsEnsured = true;

  const existing = await prisma.notificationTemplate.findMany({
    where: {
      OR: DEFAULT_NOTIFICATION_TEMPLATES.map((t) => ({
        type: t.type,
        variant: t.variant,
      })),
    },
    select: { type: true, variant: true },
  });

  const existingKeys = new Set(existing.map((t) => `${t.type}::${t.variant}`));
  const missing = DEFAULT_NOTIFICATION_TEMPLATES.filter(
    (t) => !existingKeys.has(`${t.type}::${t.variant}`)
  );

  if (!missing.length) return;

  await prisma.notificationTemplate.createMany({
    data: missing.map((t) => ({
      type: t.type,
      variant: t.variant,
      titleTemplate: t.titleTemplate,
      bodyTemplate: t.bodyTemplate,
    })),
    skipDuplicates: true,
  });
}

export async function renderNotificationFromTemplate(params: {
  type: NotificationTemplateType;
  variant: NotificationTemplateVariant;
  context: PlaceholderContext;
}) {
  const template = await getEnabledNotificationTemplate({ type: params.type, variant: params.variant });
  if (!template) return null;

  const title = renderTemplate(template.titleTemplate, params.context).trim();
  const body = renderTemplate(template.bodyTemplate, params.context).trim();
  const preview = body ? sanitizePreviewText(body, 120) : "";

  return {
    templateId: template.id,
    title,
    body,
    preview: preview || null,
  };
}
