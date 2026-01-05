import { FastifyInstance } from "fastify";
import { NotificationController } from "../controllers/notificationController";

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/notifications", NotificationController.listForUser);
  fastify.get("/api/v1/notifications/unread-count", NotificationController.unreadCount);
  fastify.post("/api/v1/notifications/read", NotificationController.markAllRead);
  fastify.post("/api/v1/notifications/:id/read", NotificationController.markRead);
  fastify.post("/api/v1/notifications/clear", NotificationController.clearAll);
}
