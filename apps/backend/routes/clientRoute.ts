import { FastifyInstance } from "fastify";
import { ClientController } from "../controllers/clientController";
import { requireAuth } from "../lib/permissions";

export async function clientRoutes(fastify: FastifyInstance) {
  // ============================================================
  // CREATE CLIENT
  // ============================================================
  fastify.post(
    "/api/v1/clients",
    // Any authenticated user can create clients
    { preHandler: requireAuth() },
    ClientController.create
  );

  // ============================================================
  // READ / GET CLIENTS
  // ============================================================
  fastify.get(
    "/api/v1/clients",
    // Any authenticated user can see client list
    { preHandler: requireAuth() },
    ClientController.listPaginated
  );

  // Unified detail endpoint
  fastify.get(
    "/api/v1/clients/:id",
    // Any authenticated user can see client details
    { preHandler: requireAuth() },
    ClientController.getById
  );

  // ============================================================
  // UPDATE CLIENT
  // ============================================================
  fastify.put(
    "/api/v1/clients/:id",
    // Any authenticated user can update clients
    { preHandler: requireAuth() },
    ClientController.update
  );

  // ============================================================
  // DELETE CLIENT
  // ============================================================
  fastify.delete(
    "/api/v1/clients/:id",
    // Any authenticated user can delete clients
    { preHandler: requireAuth() },
    ClientController.remove
  );
}
