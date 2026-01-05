import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";
import { checkSession } from "../lib/session";

export const UserController = {
  // ============================================================
  // LIST USERS (admin only)
  // ============================================================
  async list(_request: Request, reply: Reply) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        language: true,
        accentColor: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const normalized = users.map((u) => ({
      ...u,
      roleId: u.role?.id ?? null,
    }));

    reply.send({ success: true, users: normalized });
  },

  // ============================================================
  // LIST USERS (assignable, authenticated)
  // ============================================================
  async listAssignable(request: Request, reply: Reply) {
    const sessionUser = await checkSession(request);
    if (!sessionUser) {
      return reply.code(401).send({ success: false, message: "Unauthorized" });
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accentColor: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const normalized = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      accentColor: u.accentColor,
      roleId: u.role?.id ?? null,
      roleName: u.role?.name ?? null,
    }));

    return reply.send({ success: true, users: normalized });
  },

  // ============================================================
  // CREATE USER (admin only)
  // ============================================================
  async create(request: Request, reply: Reply) {
    const { email, name, password, roleId } = request.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(400).send({ message: "Email already exists" });
    }

    const generatedPassword =
      password || crypto.randomBytes(8).toString("base64url");
    const hash = await bcrypt.hash(generatedPassword, 10);

    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hash,
        firstLogin: true,
        accentColor: "primary",
        ...(roleId ? { role: { connect: { id: roleId } } } : {}),
      },
    });

    reply.send({ success: true, password: generatedPassword });
  },

  // ============================================================
  // DELETE USER (admin only)
  // ============================================================
  async deleteUser(request: Request, reply: Reply) {
    const { id } = request.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ message: "User not found" });

    await prisma.notes.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });

    return reply.send({ success: true });
  },

  // ============================================================
  // UPDATE USER ROLE (admin only)
  // ============================================================
  async updateRole(request: Request, reply: Reply) {
    const { id, roleId } = request.body;

    await prisma.user.update({
      where: { id },
      data: { roleId: roleId || null },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // UPDATE PROFILE (self)
  // ============================================================
  async updateProfile(request: Request, reply: Reply) {
    const sessionUser = await checkSession(request);
    if (!sessionUser)
      return reply.code(401).send({ message: "Unauthorized" });

    const { name, email, phone, language, accentColor } = request.body;

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { name, email, phone, language, accentColor },
    });

    return reply.send({ user: updated });
  },

  // ============================================================
  // UPDATE NOTIFICATION SETTINGS (self)
  // ============================================================
  async updateNotificationSettings(request: Request, reply: Reply) {
    const sessionUser = await checkSession(request);
    if (!sessionUser)
      return reply.code(401).send({ message: "Unauthorized" });

    const body = request.body || {};

    const delegate = (prisma as any).notificationPreferences;
    if (!delegate?.upsert) {
      return reply.code(500).send({
        message:
          "NotificationPreferences model is not available. Run Prisma migrate/generate and restart the backend.",
      });
    }

    const updated = await delegate.upsert({
      where: { userId: sessionUser.id },
      update: {
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        onTicketCreated: typeof body.onTicketCreated === "boolean" ? body.onTicketCreated : undefined,
        onTicketAssigned: typeof body.onTicketAssigned === "boolean" ? body.onTicketAssigned : undefined,
        onStatusUpdate: typeof body.onStatusUpdate === "boolean" ? body.onStatusUpdate : undefined,
        onInternalNote: typeof body.onInternalNote === "boolean" ? body.onInternalNote : undefined,
      },
      create: {
        userId: sessionUser.id,
        enabled: typeof body.enabled === "boolean" ? body.enabled : true,
        onTicketCreated: typeof body.onTicketCreated === "boolean" ? body.onTicketCreated : true,
        onTicketAssigned: typeof body.onTicketAssigned === "boolean" ? body.onTicketAssigned : true,
        onStatusUpdate: typeof body.onStatusUpdate === "boolean" ? body.onStatusUpdate : true,
        onInternalNote: typeof body.onInternalNote === "boolean" ? body.onInternalNote : true,
      },
      select: {
        enabled: true,
        onTicketCreated: true,
        onTicketAssigned: true,
        onStatusUpdate: true,
        onInternalNote: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.send({
      success: true,
      notificationPreferences: updated,
      notificationsEnabled: updated.enabled,
    });
  },

  // ============================================================
  // MARK NOTIFICATION AS READ (self)
  // ============================================================
  async markNotificationRead(request: Request, reply: Reply) {
    const sessionUser = await checkSession(request);
    if (!sessionUser)
      return reply.code(401).send({ message: "Unauthorized" });

    const { id } = request.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification)
      return reply.code(404).send({ message: "Notification not found" });

    if (notification.userId !== sessionUser.id) {
      return reply.code(403).send({
        message: "Access denied: cannot mark other users' notifications.",
      });
    }

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // CLEAR FIRST LOGIN FLAG
  // ============================================================
  async firstLogin(request: Request, reply: Reply) {
    const { id } = request.params;

    await prisma.user.update({
      where: { id },
      data: { firstLogin: false },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // ADMIN UPDATE USER
  // ============================================================
  async adminUpdateUser(request: Request, reply: Reply) {
    const { id } = request.params;
    const {
      name,
      email,
      phone,
      language,
      accentColor,
      password,
      roleId,
      resetPassword,
    } = request.body;

    try {
      const data: any = {
        name,
        email,
        phone,
        language,
        accentColor,
        roleId: roleId || null,
      };

      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      let generatedPassword: string | undefined;

      if (resetPassword || password) {
        const nextPassword = password || crypto.randomBytes(8).toString("base64url");
        generatedPassword = nextPassword;
        data.password = await bcrypt.hash(nextPassword, 10);
        data.firstLogin = true;
      }

      const updated = await prisma.user.update({
        where: { id },
        data,
        include: {
          role: {
            select: { id: true, name: true },
          },
        },
      });

      return reply.send({ success: true, user: updated, password: generatedPassword });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return reply.code(404).send({ message: "User not found" });
      }
      throw err;
    }
  },
};
