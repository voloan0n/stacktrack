import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "../lib/notifications/defaultTemplates";
import { bustTemplateCache } from "../lib/notifications/templateService";
import {
  renderTemplate,
  sanitizePreviewText,
  validateTemplateFields,
  type NotificationTemplateType,
  type NotificationTemplateVariant,
} from "../lib/notifications/templateRenderer";

const DEFAULT_VARIANT: NotificationTemplateVariant = "short";

function getDefaultTemplate(type: NotificationTemplateType, variant: NotificationTemplateVariant) {
  return DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.type === type && t.variant === variant) || null;
}

function sampleContextForType(type: NotificationTemplateType) {
  const base = {
    ticketNumber: "123",
    ticketSubject: "Printer Not Working",
    requesterName: "Jane Doe",
    authorName: "John Admin",
    oldStatus: "New",
    newStatus: "In Progress",
    notePreview: "Added troubleshooting steps and requested logs.",
  };

  switch (type) {
    case "ticket.created":
      return { ...base, oldStatus: "", newStatus: "", notePreview: "" };
    case "ticket.assigned":
      return { ...base, oldStatus: "", newStatus: "", notePreview: "" };
    case "ticket.status.updated":
      return { ...base, notePreview: "" };
    case "ticket.note.created":
      return { ...base, oldStatus: "", newStatus: "" };
    default:
      return base;
  }
}

export const NotificationTemplateController = {
  async list(_request: Request, reply: Reply) {
    const templates = await prisma.notificationTemplate.findMany({
      orderBy: [{ type: "asc" }, { variant: "asc" }],
    });
    return reply.send({ success: true, templates });
  },

  async update(request: Request, reply: Reply) {
    const body = request.body as {
      type: NotificationTemplateType;
      variant?: NotificationTemplateVariant;
      titleTemplate: string;
      bodyTemplate: string;
    };

    const type = body?.type;
    const variant = body?.variant || DEFAULT_VARIANT;

    const validation = validateTemplateFields({
      titleTemplate: body?.titleTemplate || "",
      bodyTemplate: body?.bodyTemplate || "",
    });
    if (validation.errors.length) {
      return reply.code(400).send({ success: false, message: validation.errors[0], errors: validation.errors, warnings: validation.warnings });
    }

    const updated = await prisma.notificationTemplate.upsert({
      where: { type_variant: { type, variant } },
      create: {
        type,
        variant,
        titleTemplate: body.titleTemplate,
        bodyTemplate: body.bodyTemplate,
      },
      update: {
        titleTemplate: body.titleTemplate,
        bodyTemplate: body.bodyTemplate,
      },
    });

    bustTemplateCache(type);

    return reply.send({ success: true, template: updated, warnings: validation.warnings });
  },

  async reset(request: Request, reply: Reply) {
    const body = request.body as { type: NotificationTemplateType; variant?: NotificationTemplateVariant };
    const type = body?.type;
    const variant = body?.variant || DEFAULT_VARIANT;

    const defaultTemplate = getDefaultTemplate(type, variant);
    if (!defaultTemplate) {
      return reply.code(404).send({ success: false, message: "No default template found for that type/variant." });
    }

    const updated = await prisma.notificationTemplate.upsert({
      where: { type_variant: { type, variant } },
      create: {
        type,
        variant,
        titleTemplate: defaultTemplate.titleTemplate,
        bodyTemplate: defaultTemplate.bodyTemplate,
      },
      update: {
        titleTemplate: defaultTemplate.titleTemplate,
        bodyTemplate: defaultTemplate.bodyTemplate,
      },
    });

    bustTemplateCache(type);

    return reply.send({ success: true, template: updated });
  },

  async preview(request: Request, reply: Reply) {
    const body = request.body as {
      type: NotificationTemplateType;
      variant?: NotificationTemplateVariant;
      titleTemplate: string;
      bodyTemplate: string;
      context?: Record<string, string | null | undefined>;
    };

    const type = body?.type;
    const variant = body?.variant || DEFAULT_VARIANT;
    const validation = validateTemplateFields({
      titleTemplate: body?.titleTemplate || "",
      bodyTemplate: body?.bodyTemplate || "",
    });
    if (validation.errors.length) {
      return reply.code(400).send({ success: false, message: validation.errors[0], errors: validation.errors, warnings: validation.warnings });
    }

    const context = { ...sampleContextForType(type), ...(body.context || {}) };

    const title = renderTemplate(body.titleTemplate, context).trim();
    const renderedBody = renderTemplate(body.bodyTemplate, context).trim();
    const preview = renderedBody ? sanitizePreviewText(renderedBody, 120) : "";

    return reply.send({
      success: true,
      type,
      variant,
      rendered: {
        title,
        body: renderedBody,
        preview: preview || null,
      },
      warnings: validation.warnings,
    });
  },
};
