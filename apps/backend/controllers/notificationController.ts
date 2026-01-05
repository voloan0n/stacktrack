import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";
import { checkSession } from "../lib/session";

export const NotificationController = {
  async listForUser(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        type: true,
        ticketNumber: true,
        title: true,
        body: true,
        preview: true,
        readAt: true,
        entityType: true,
        entityId: true,
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

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return reply.send({ success: true, notifications, unreadCount });
  },

  async markAllRead(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return reply.send({ success: true });
  },

  async markRead(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true, readAt: true },
    });

    if (!notification) return reply.code(404).send({ success: false, message: "Not found" });
    if (notification.userId !== user.id) return reply.code(403).send({ success: false, message: "Forbidden" });

    if (!notification.readAt) {
      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return reply.send({ success: true, unreadCount });
  },

  async unreadCount(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    const count = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return reply.send({ count });
  },

  async clearAll(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });

    await prisma.notification.deleteMany({ where: { userId: user.id } });
    return reply.send({ success: true });
  },
};
