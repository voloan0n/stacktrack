import { FastifyInstance } from "fastify";
import { TicketController } from "../controllers/ticketController";
import { requireAuth } from "../lib/permissions";

export async function ticketRoutes(fastify: FastifyInstance) {
  // ============================================================
  // CREATE TICKETS
  // ============================================================
  fastify.post(
    "/api/v1/tickets",
    // Any authenticated user (e.g. tech) can create tickets
    { preHandler: requireAuth() },
    TicketController.create
  );

  // Public ticket creation (no auth required)
  fastify.post("/api/v1/tickets/public", TicketController.createPublic);

  // ============================================================
  // READ / GET TICKETS
  // ============================================================

  // Paginated ticket list (NEW — this replaces listAll, search, open)
  fastify.get(
    "/api/v1/tickets",
    // Any authenticated user can see tickets
    { preHandler: requireAuth() },
    TicketController.listPaginated
  );

  // Get single ticket by ID
  fastify.get(
    "/api/v1/tickets/:id",
    // Any authenticated user can see ticket details
    { preHandler: requireAuth() },
    TicketController.getById
  );

  // Update ticket fields
  fastify.put(
    "/api/v1/tickets/:id",
    // Any authenticated user can attempt update; controller enforces admin/assignee
    { preHandler: requireAuth() },
    TicketController.update
  );

  // ============================================================
  // UPDATE / MUTATE
  // ============================================================

  // Update ticket status
  fastify.put(
    "/api/v1/tickets/status",
    // Any authenticated user can attempt status change; controller enforces admin/assignee
    { preHandler: requireAuth() },
    TicketController.updateStatus
  );

  // Transfer ticket to another user
  fastify.post(
    "/api/v1/tickets/transfer",
    // Any authenticated user can attempt assignment; controller enforces admin/assignee
    { preHandler: requireAuth() },
    TicketController.transferUser
  );

  // ============================================================
  // COMMENTS
  // ============================================================

  fastify.post(
    "/api/v1/tickets/comment",
    { preHandler: requireAuth() },
    TicketController.comment
  );
  fastify.post(
    "/api/v1/tickets/note",
    // Any authenticated user can add internal notes
    { preHandler: requireAuth() },
    TicketController.addNote
  );

  fastify.post(
    "/api/v1/tickets/comment/delete",
    { preHandler: requireAuth() },
    TicketController.deleteComment
  );

  // ============================================================
  // DELETE
  // ============================================================

  fastify.post(
    "/api/v1/tickets/delete",
    // Any authenticated user can delete tickets
    { preHandler: requireAuth() },
    TicketController.delete
  );
}
