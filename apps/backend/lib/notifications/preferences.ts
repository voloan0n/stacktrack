import { prisma } from "../../config/prisma";

export type NotificationPreferencesRecord = {
  enabled: boolean;
  onTicketCreated: boolean;
  onTicketAssigned: boolean;
  onStatusUpdate: boolean;
  onInternalNote: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferencesRecord = {
  enabled: true,
  onTicketCreated: true,
  onTicketAssigned: true,
  onStatusUpdate: true,
  onInternalNote: true,
};

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferencesRecord> {
  const delegate = (prisma as any).notificationPreferences;
  if (!delegate?.findUnique) return { ...DEFAULT_NOTIFICATION_PREFS };

  const prefs = await delegate.findUnique({
    where: { userId },
    select: {
      enabled: true,
      onTicketCreated: true,
      onTicketAssigned: true,
      onStatusUpdate: true,
      onInternalNote: true,
    },
  });

  return prefs ? (prefs as NotificationPreferencesRecord) : { ...DEFAULT_NOTIFICATION_PREFS };
}

export async function getOrCreateNotificationPreferences(userId: string) {
  const delegate = (prisma as any).notificationPreferences;
  if (!delegate?.upsert) {
    return {
      id: "missing-notification-preferences-model",
      userId,
      ...DEFAULT_NOTIFICATION_PREFS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return delegate.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...DEFAULT_NOTIFICATION_PREFS,
    },
    select: {
      id: true,
      userId: true,
      enabled: true,
      onTicketCreated: true,
      onTicketAssigned: true,
      onStatusUpdate: true,
      onInternalNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
