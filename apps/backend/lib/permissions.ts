// apps/backend/lib/permissions.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { checkSession } from "./session";

function isAdminPermissions(permissions: string[]) {
  return (
    permissions.includes("*") ||
    permissions.includes("user.manage") ||
    permissions.includes("settings.manage")
  );
}

/**
 * Require any authenticated user
 */
export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    (request as any).user = user;
  };
}

/**
 * Require admin
 */
export function requireAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (!isAdminPermissions(permissions)) return reply.code(403).send({ error: "Forbidden" });

    (request as any).user = user;
  };
}

/**
 * Require Self OR Admin
 */
export function requireSelfOrAdmin(paramKey: string = "id") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });

    const resourceId = (request.params as any)?.[paramKey];
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (user.id !== resourceId && !isAdminPermissions(permissions)) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    (request as any).user = user;
  };
}

/**
 * Role/perm-based authorization
 *
 * Usage:
 *   requirePermission("ticket.update")
 *   requirePermission(["ticket.update", "ticket.assign"])
 */
export function requirePermission(perms: string | string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });

    const required = Array.isArray(perms) ? perms : [perms];
    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

    const hasAll = required.every((required) => {
      if (userPerms.includes("*")) return true;

      return userPerms.some((p) => {
        if (p === required) return true;
        if (p.endsWith("::*") && required.startsWith(p.replace("::*", "::"))) return true;
        if (p.endsWith(".*") && required.startsWith(p.slice(0, -1))) return true;
        return false;
      });
    });

    if (!hasAll) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    (request as any).user = user;
  };
}
