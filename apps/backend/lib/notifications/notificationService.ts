import { prisma } from "../../config/prisma";
import { emitToUser } from "./wsHub";
import { getNotificationPreferences } from "./preferences";
import type { NotificationTemplateType } from "./templateRenderer";
import { renderNotificationFromTemplate } from "./templateService";

const debugEnabled = process.env.NOTIFICATION_DEBUG === "1";
const debug = (...args: any[]) => {
  if (debugEnabled) console.log("[notifications]", ...args);
};

function shouldCreate(event: NotificationTemplateType, prefs: any) {
  switch (event) {
    case "ticket.created":
      return Boolean(prefs.onTicketCreated);
    case "ticket.assigned":
      return Boolean(prefs.onTicketAssigned);
    case "ticket.status.updated":
      return Boolean(prefs.onStatusUpdate);
    case "ticket.note.created":
      return Boolean(prefs.onInternalNote);
    default:
      return false;
  }
}

function shouldEmit(event: NotificationTemplateType, prefs: any) {
  return Boolean(prefs.enabled) && shouldCreate(event, prefs);
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function createNotificationForUser(params: {
  userId: string;
  actorUserId?: string | null;
  type: NotificationTemplateType;
  entityType: string;
  entityId: string;
  ticketNumber?: number | null;
  context: Record<string, string | null | undefined>;
}) {
  const prefs = await getNotificationPreferences(params.userId);
  if (!shouldCreate(params.type, prefs)) return null;

  const rendered = await renderNotificationFromTemplate({
    type: params.type,
    variant: "short",
    context: params.context,
  });
  if (!rendered?.title) return null;

  debug("create", params.type, { userId: params.userId, type: params.type, entityId: params.entityId });

  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      actorUserId: params.actorUserId ?? null,
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      ticketNumber: typeof params.ticketNumber === "number" ? params.ticketNumber : null,
      title: rendered.title,
      body: rendered.body,
      preview: rendered.preview,
    },
    select: {
      id: true,
      type: true,
      entityType: true,
      entityId: true,
      ticketNumber: true,
      title: true,
      body: true,
      preview: true,
      createdAt: true,
      readAt: true,
      userId: true,
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          accentColor: true,
          image: true,
        },
      },
    },
  });

  const unreadCount = await getUnreadCount(params.userId);

  if (shouldEmit(params.type, prefs)) {
    debug("emit", params.type, { userId: params.userId, unreadCount });
    emitToUser(params.userId, {
      event: "notification:new",
      data: {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          preview: notification.preview,
          createdAt: notification.createdAt,
          actor: notification.actor,
          entityType: notification.entityType,
          entityId: notification.entityId,
          ticketNumber: notification.ticketNumber,
        },
        unreadCount,
      },
    });
  }

  return { notification, unreadCount };
}

async function getTicketAssigneeUserIds(ticketId: string) {
  const assignees = await prisma.ticketAssignment.findMany({
    where: { ticketId },
    select: { userId: true },
  });
  return assignees.map((a) => a.userId);
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function compactText(value?: string | null, maxLen = 120) {
  const normalized = String(value || "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

async function getTicketTemplateContext(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      title: true,
      createdBy: { select: { name: true } },
    },
  });
  if (!ticket) return null;

  return {
    ticketNumberValue: typeof ticket.number === "number" ? ticket.number : null,
    ticketNumber: typeof ticket.number === "number" ? String(ticket.number) : "",
    ticketSubject: ticket.title || "",
    requesterName: ticket.createdBy?.name || "",
  };
}

async function getActorName(actorUserId?: string | null) {
  if (!actorUserId) return "";
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { name: true },
  });
  return actor?.name || "";
}

export async function notifyTicketAssigned(params: {
  ticketId: string;
  ticketNumber?: number | null;
  assigneeUserId: string;
  actorUserId?: string | null;
}) {
  const base = await getTicketTemplateContext(params.ticketId);
  if (!base) return null;
  const { ticketNumberValue, ...baseContext } = base;
  const authorName = await getActorName(params.actorUserId);

  return createNotificationForUser({
    userId: params.assigneeUserId,
    actorUserId: params.actorUserId ?? null,
    type: "ticket.assigned",
    entityType: "ticket",
    entityId: params.ticketId,
    ticketNumber: ticketNumberValue,
    context: {
      ...baseContext,
      authorName,
    },
  });
}

export async function notifyTicketCreated(params: {
  ticketId: string;
  ticketNumber?: number | null;
  title?: string | null;
  createdByUserId?: string | null;
}) {
  const base = await getTicketTemplateContext(params.ticketId);
  if (!base) return null;
  const { ticketNumberValue, ...baseContext } = base;
  const authorName = await getActorName(params.createdByUserId);

  const users = await prisma.user.findMany({
    select: { id: true },
  });
  const recipients = users.map((u) => u.id).filter((id) => id !== params.createdByUserId);

  const results = [];
  for (const userId of recipients) {
    results.push(
      await createNotificationForUser({
        userId,
        actorUserId: params.createdByUserId ?? null,
        type: "ticket.created",
        entityType: "ticket",
        entityId: params.ticketId,
        ticketNumber: ticketNumberValue,
        context: {
          ...baseContext,
          ticketSubject: params.title || baseContext.ticketSubject,
          authorName,
        },
      })
    );
  }
  return results;
}

export async function notifyTicketStatusUpdated(params: {
  ticketId: string;
  ticketNumber?: number | null;
  oldStatus?: string | null;
  newStatus: string;
  actorUserId?: string | null;
}) {
  const base = await getTicketTemplateContext(params.ticketId);
  if (!base) return null;
  const { ticketNumberValue, ...baseContext } = base;
  const authorName = await getActorName(params.actorUserId);

  const recipients = (await getTicketAssigneeUserIds(params.ticketId)).filter(
    (id) => id !== params.actorUserId
  );

  const results = [];
  for (const userId of recipients) {
    results.push(
      await createNotificationForUser({
        userId,
        actorUserId: params.actorUserId ?? null,
        type: "ticket.status.updated",
        entityType: "ticket",
        entityId: params.ticketId,
        ticketNumber: ticketNumberValue,
        context: {
          ...baseContext,
          authorName,
          oldStatus: params.oldStatus ? humanizeKey(params.oldStatus) : "",
          newStatus: humanizeKey(params.newStatus),
        },
      })
    );
  }

  return results;
}

export async function notifyTicketNoteCreated(params: {
  ticketId: string;
  ticketNumber?: number | null;
  notePreview?: string | null;
  actorUserId?: string | null;
}) {
  const base = await getTicketTemplateContext(params.ticketId);
  if (!base) return null;
  const { ticketNumberValue, ...baseContext } = base;
  const authorName = await getActorName(params.actorUserId);

  const recipients = (await getTicketAssigneeUserIds(params.ticketId)).filter(
    (id) => id !== params.actorUserId
  );

  const results = [];
  for (const userId of recipients) {
    results.push(
      await createNotificationForUser({
        userId,
        actorUserId: params.actorUserId ?? null,
        type: "ticket.note.created",
        entityType: "ticket",
        entityId: params.ticketId,
        ticketNumber: ticketNumberValue,
        context: {
          ...baseContext,
          authorName,
          notePreview: compactText(params.notePreview, 120),
        },
      })
    );
  }

  return results;
}

// Backwards-compat alias (internal notes now treated as notes).
export const notifyTicketInternalNote = notifyTicketNoteCreated;
