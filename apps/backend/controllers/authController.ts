import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { signToken } from "../lib/jwt";
import type { Reply, Request } from "../lib/http";
import { checkSession } from "../lib/session";
import { getOrCreateNotificationPreferences } from "../lib/notifications/preferences";

const hasCommentPermission = (permissions: string[]) =>
  permissions.includes("*") || permissions.includes("ticket.comment");

const isAdminPermissions = (permissions: string[]) =>
  permissions.includes("*") || permissions.includes("user.manage") || permissions.includes("settings.manage");

export const AuthController = {
  // ============================================================
  // LOGIN
  // ============================================================
  async login(request: Request, reply: Reply) {
    const { email, password, remember } = request.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!user || !user.password) {
      return reply.code(401).send({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return reply.code(401).send({ message: "Invalid email or password" });
    }

    const sessionId = crypto.randomBytes(32).toString("hex");

    const sessionToken = signToken(
      {
        id: user.id,
        sessionId,
      },
      remember
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        userAgent: request.headers["user-agent"] || "",
        ipAddress: request.ip,
        expires: remember
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    const permissions = Array.isArray(user.role?.permissions)
      ? Array.from(new Set(user.role.permissions.map((p: any) => p.name)))
      : [];
    const canCommentTicket = hasCommentPermission(permissions);

    const primaryRole = user.role?.name || null;
    const notificationPreferences = await getOrCreateNotificationPreferences(user.id);

    return reply.send({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        language: user.language || "en",
        accentColor: user.accentColor || "primary",
        notificationPreferences: {
          enabled: notificationPreferences.enabled,
          onTicketCreated: notificationPreferences.onTicketCreated,
          onTicketAssigned: notificationPreferences.onTicketAssigned,
          onStatusUpdate: notificationPreferences.onStatusUpdate,
          onInternalNote: notificationPreferences.onInternalNote,
        },
        notificationsEnabled: notificationPreferences.enabled,
        firstLogin: user.firstLogin,
        role: primaryRole,
        permissions,
        canCommentTicket,
      },
    });
  },

  // ============================================================
  // CURRENT USER
  // ============================================================
  async me(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    const canCommentTicket = hasCommentPermission(permissions);
    const primaryRole = user.role?.name ?? null;
    const notificationPreferences = await getOrCreateNotificationPreferences(user.id);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        accentColor: user.accentColor || "primary",
        notificationPreferences: {
          enabled: notificationPreferences.enabled,
          onTicketCreated: notificationPreferences.onTicketCreated,
          onTicketAssigned: notificationPreferences.onTicketAssigned,
          onStatusUpdate: notificationPreferences.onStatusUpdate,
          onInternalNote: notificationPreferences.onInternalNote,
        },
        notificationsEnabled: notificationPreferences.enabled,
        firstLogin: user.firstLogin,
        role: primaryRole,
        permissions,
        canCommentTicket,
      },
    });
  },

  // ============================================================
  // LOGOUT
  // ============================================================
  async logout(request: Request, reply: Reply) {
    const bearer = request.headers.authorization?.split(" ")[1];
    if (!bearer) {
      return reply.send({ success: true });
    }

    await prisma.session.deleteMany({
      where: { sessionToken: bearer },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // REGISTER (admin only)
  // ============================================================
  async register(request: Request, reply: Reply) {
    const { email, password, name, admin } = request.body;

    const requester = await checkSession(request);
    const requesterPerms = Array.isArray(requester?.permissions) ? requester.permissions : [];
    if (!requester || !isAdminPermissions(requesterPerms)) {
      return reply.code(403).send({ message: "Unauthorized" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(400).send({ message: "Email already exists" });
    }

    const adminRole = admin
      ? await prisma.role.findFirst({
          where: {
            OR: [{ name: "System Administrator" }, { permissions: { some: { name: "*" } } }],
          },
          select: { id: true },
        })
      : null;
    if (admin && !adminRole) {
      return reply.code(500).send({ message: "Admin role not configured" });
    }

    await prisma.user.create({
      data: {
        email,
        name,
        password: await bcrypt.hash(password, 10),
        accentColor: "primary",
        ...(adminRole ? { role: { connect: { id: adminRole.id } } } : {}),
      },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // PASSWORD RESET (request code)
  // ============================================================
  async requestPasswordReset(request: Request, reply: Reply) {
    const { email } = request.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(404).send({ message: "Email not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const record = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        code,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] password reset code for ${email}: ${code} (token ${record.id})`);
    }

    return reply.send({ success: true });
  },

  // ============================================================
  // PASSWORD RESET (apply new password)
  // ============================================================
  async resetPassword(request: Request, reply: Reply) {
    const { uuid, code, password } = request.body;

    const record = await prisma.passwordResetToken.findUnique({
      where: { id: uuid, code },
    });

    if (!record) {
      return reply.code(400).send({ message: "Invalid reset code" });
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: {
        password: await bcrypt.hash(password, 10),
      },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // PASSWORD CHANGE (authenticated user)
  // ============================================================
  async changePassword(request: Request, reply: Reply) {
    const sessionUser = await checkSession(request);
    if (!sessionUser) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = request.body;

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ message: "Missing password fields" });
    }

    if (newPassword.length < 8) {
      return reply
        .code(400)
        .send({ message: "New password must be at least 8 characters long" });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { password: true, id: true },
    });

    if (!user || !user.password) {
      return reply
        .code(400)
        .send({ message: "Password change is not available for this account" });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return reply.code(401).send({ message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { password: hash, firstLogin: false },
    });

    return reply.send({ success: true });
  },

  // ============================================================
  // FIRST LOGIN SKIP (development only)
  // ============================================================
  async skipFirstLogin(request: Request, reply: Reply) {
    if (process.env.NODE_ENV !== "development") {
      return reply.code(404).send({ message: "Not found" });
    }

    const sessionUser = await checkSession(request);
    if (!sessionUser) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { firstLogin: false },
    });

    return reply.send({ success: true });
  },
};
