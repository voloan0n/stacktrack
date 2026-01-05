import { FastifyInstance } from "fastify";
import { TicketOptionController } from "../controllers/ticketOptionController";
import { requireAuth, requirePermission } from "../lib/permissions";

export function ticketOptionRoutes(app: FastifyInstance) {
  app.get("/api/v1/ticket-options", { preHandler: requireAuth() }, TicketOptionController.list);

  app.post(
    "/api/v1/ticket-options/status",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertStatus
  );
  app.put(
    "/api/v1/ticket-options/status",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertStatus
  );
  app.delete(
    "/api/v1/ticket-options/status/:id",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.deleteStatus
  );

  app.post(
    "/api/v1/ticket-options/type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertType
  );
  app.put(
    "/api/v1/ticket-options/type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertType
  );
  app.delete(
    "/api/v1/ticket-options/type/:id",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.deleteType
  );

  app.post(
    "/api/v1/ticket-options/priority",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertPriority
  );
  app.put(
    "/api/v1/ticket-options/priority",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertPriority
  );
  app.delete(
    "/api/v1/ticket-options/priority/:id",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.deletePriority
  );

  app.post(
    "/api/v1/ticket-options/support-type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertSupportType
  );
  app.put(
    "/api/v1/ticket-options/support-type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertSupportType
  );
  app.delete(
    "/api/v1/ticket-options/support-type/:id",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.deleteSupportType
  );

  app.post(
    "/api/v1/ticket-options/billing-type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertBillingType
  );
  app.put(
    "/api/v1/ticket-options/billing-type",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.upsertBillingType
  );
  app.delete(
    "/api/v1/ticket-options/billing-type/:id",
    { preHandler: requirePermission("settings.manage") },
    TicketOptionController.deleteBillingType
  );
}
