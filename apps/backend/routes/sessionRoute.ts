import { FastifyInstance } from "fastify";
import { SessionController } from "../controllers/sessionController";

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/sessions", SessionController.listSessions);
  fastify.delete("/api/v1/sessions/:sessionId", SessionController.revokeSession);
}
