import { FastifyInstance } from "fastify";
import { NotificationTemplateController } from "../controllers/notificationTemplateController";
import { requirePermission } from "../lib/permissions";

export async function notificationTemplateRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/v1/admin/notification-templates",
    { preHandler: requirePermission("settings.manage") },
    NotificationTemplateController.list
  );

  fastify.put(
    "/api/v1/admin/notification-templates",
    { preHandler: requirePermission("settings.manage") },
    NotificationTemplateController.update
  );

  fastify.post(
    "/api/v1/admin/notification-templates/reset",
    { preHandler: requirePermission("settings.manage") },
    NotificationTemplateController.reset
  );

  fastify.post(
    "/api/v1/admin/notification-templates/preview",
    { preHandler: requirePermission("settings.manage") },
    NotificationTemplateController.preview
  );
}

