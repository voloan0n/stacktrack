import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/authController";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/api/v1/auth/login", AuthController.login);
  fastify.get("/api/v1/auth/logout", AuthController.logout);
  fastify.get("/api/v1/auth/me", AuthController.me);

  // Optional admin-only user creation
  fastify.post("/api/v1/auth/register", AuthController.register);

  // Password reset 
  fastify.post("/api/v1/auth/password/request", AuthController.requestPasswordReset);
  fastify.post("/api/v1/auth/password/reset", AuthController.resetPassword);
  fastify.post("/api/v1/auth/password/change", AuthController.changePassword);

  // First-login bypass (development only)
  fastify.post("/api/v1/auth/first-login/skip", AuthController.skipFirstLogin);
}
