import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";

export const RoleController = {
  // ============================================================
  // CREATE ROLE
  // ============================================================
  async createRole(request: Request, reply: Reply) {
    const { name, description, permissions } = request.body;

    const exists = await prisma.role.findUnique({ where: { name } });

    if (exists) {
      return reply.code(400).send({
        message: "Role already exists",
        success: false,
      });
    }

    const permissionNames: string[] = Array.isArray(permissions)
      ? permissions
      : [];

    const existingPerms = permissionNames.length
      ? await prisma.permission.findMany({
          where: { name: { in: permissionNames } },
        })
      : [];

    const existingNames = new Set(existingPerms.map((p) => p.name));

    const createdPerms = await Promise.all(
      permissionNames
        .filter((name: string) => !existingNames.has(name))
        .map((name: string) =>
          prisma.permission.create({
            data: { name },
          })
        )
    );

    const allPerms = [...existingPerms, ...createdPerms];

    const role = await prisma.role.create({
      data: {
        name,
        description: description || "",
        permissions: {
          connect: allPerms.map((p) => ({ id: p.id })),
        },
      },
    });

    return reply.send({
      success: true,
      role: {
        ...role,
        permissions: permissionNames,
      },
    });
  },

  // ============================================================
  // GET ALL ROLES
  // ============================================================
  async getAllRoles(_request: Request, reply: Reply) {
    const roles = await prisma.role.findMany({
      include: {
        users: false,
        permissions: true,
      },
    });

    const normalized = roles.map((role) => ({
      ...role,
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map((p) => p.name)
        : [],
    }));

    return reply.send({
      roles: normalized,
      success: true,
    });
  },

  // ============================================================
  // GET ROLE BY ID
  // ============================================================
  async getRoleById(request: Request, reply: Reply) {
    const { id } = request.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        permissions: true,
      },
    });

    if (!role) {
      return reply.code(404).send({
        message: "Role not found",
        success: false,
      });
    }

    return reply.send({
      success: true,
      role: {
        ...role,
        permissions: Array.isArray(role.permissions)
          ? role.permissions.map((p) => p.name)
          : [],
      },
    });
  },

  // ============================================================
  // UPDATE ROLE
  // ============================================================
  async updateRole(request: Request, reply: Reply) {
    const { id } = request.params;
    const { name, description, permissions } = request.body;

    try {
      const permissionNames: string[] = Array.isArray(permissions)
        ? permissions
        : [];

      const existingPerms = permissionNames.length
        ? await prisma.permission.findMany({
            where: { name: { in: permissionNames } },
          })
        : [];

      const existingNames = new Set(existingPerms.map((p) => p.name));

      const createdPerms = await Promise.all(
        permissionNames
          .filter((name: string) => !existingNames.has(name))
          .map((name: string) =>
            prisma.permission.create({
              data: { name },
            })
          )
      );

      const allPerms = [...existingPerms, ...createdPerms];

      const updatedRole = await prisma.role.update({
        where: { id },
        data: {
          name,
          description,
          updatedAt: new Date(),
          permissions: {
            set: allPerms.map((p) => ({ id: p.id })),
          },
        },
      });

      return reply.send({
        success: true,
        role: {
          ...updatedRole,
          permissions: permissionNames,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return reply.code(404).send({
          message: "Role not found",
          success: false,
        });
      }
      throw err;
    }
  },

  // ============================================================
  // DELETE ROLE
  // ============================================================
  async deleteRole(request: Request, reply: Reply) {
    const { id } = request.params;

    try {
      await prisma.role.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return reply.code(404).send({
          message: "Role not found",
          success: false,
        });
      }
      throw err;
    }
  },

  // ============================================================
  // ASSIGN ROLE TO USER
  // ============================================================
  async assignRole(request: Request, reply: Reply) {
    const { userId, roleId } = request.body;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          roleId,
        },
        include: {
          role: true,
        },
      });

      return reply.send({ success: true, user });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return reply.code(404).send({
          message: "User or Role not found",
          success: false,
        });
      }
      throw err;
    }
  },

  // ============================================================
  // REMOVE ROLE FROM USER
  // ============================================================
  async removeRole(request: Request, reply: Reply) {
    const { userId, roleId: _roleId } = request.body;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          roleId: null,
        },
        include: {
          role: true,
        },
      });

      return reply.send({ success: true, user });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return reply.code(404).send({
          message: "User or Role not found",
          success: false,
        });
      }
      throw err;
    }
  },
};
