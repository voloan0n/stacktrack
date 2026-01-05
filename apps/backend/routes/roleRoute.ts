import { FastifyInstance } from "fastify";
import { RoleController } from "../controllers/roleController";
import { requirePermission } from "../lib/permissions";

export async function roleRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/v1/role/create",
    { preHandler: requirePermission("settings.manage") },
    RoleController.createRole
  );

  fastify.get(
    "/api/v1/roles/all",
    { preHandler: requirePermission("settings.manage") },
    RoleController.getAllRoles
  );

  fastify.get(
    "/api/v1/role/:id",
    { preHandler: requirePermission("settings.manage") },
    RoleController.getRoleById
  );

  fastify.put(
    "/api/v1/role/:id/update",
    { preHandler: requirePermission("settings.manage") },
    RoleController.updateRole
  );

  fastify.delete(
    "/api/v1/role/:id/delete",
    { preHandler: requirePermission("settings.manage") },
    RoleController.deleteRole
  );

  fastify.post(
    "/api/v1/role/assign",
    { preHandler: requirePermission("settings.manage") },
    RoleController.assignRole
  );

  fastify.post(
    "/api/v1/role/remove",
    { preHandler: requirePermission("settings.manage") },
    RoleController.removeRole
  );
}
