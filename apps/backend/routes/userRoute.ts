import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/userController";
import { requirePermission } from "../lib/permissions";

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/v1/users/all",
    { preHandler: requirePermission("user.manage") },
    UserController.list
  );

  fastify.get(
    "/api/v1/users/assignable",
    UserController.listAssignable
  );

  fastify.post(
    "/api/v1/user/new",
    { preHandler: requirePermission("user.manage") },
    UserController.create
  );

  fastify.delete(
    "/api/v1/user/:id",
    { preHandler: requirePermission("user.manage") },
    UserController.deleteUser
  );

  fastify.put(
    "/api/v1/user/role",
    { preHandler: requirePermission("user.manage") },
    UserController.updateRole
  );

  fastify.put(
    "/api/v1/user/profile",
    UserController.updateProfile
  );

  fastify.put(
    "/api/v1/user/notifications",
    UserController.updateNotificationSettings
  );

  fastify.post(
    "/api/v1/user/:id/first-login",
    { preHandler: requirePermission("user.manage") },
    UserController.firstLogin
  );

  fastify.put(
    "/api/v1/user/:id",
    { preHandler: requirePermission("user.manage") },
    UserController.adminUpdateUser
  );
}
