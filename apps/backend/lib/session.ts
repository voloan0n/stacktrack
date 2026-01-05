// apps/backend/lib/session.ts (or wherever yours lives)
import { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";

export async function checkSession(request: FastifyRequest) {
  try {
    const auth = request.headers.authorization;
    const bearer = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : null;

    if (!bearer) {
      console.log("[checkSession] ❌ No Authorization header");
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn("[checkSession] ❌ Missing JWT secret");
      return null;
    }

    try {
      jwt.verify(bearer, secret);
    } catch (e) {
      console.warn("[checkSession] ❌ Invalid JWT, deleting session");
      await prisma.session.deleteMany({ where: { sessionToken: bearer } });
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: bearer },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      console.log("[checkSession] ❌ No DB session found");
      return null;
    }

    if (session.expires < new Date()) {
      console.log("[checkSession] ⏰ Session expired");
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    const ip = request.ip || "";
    const ua = request.headers["user-agent"] || "";

    // Detect SSR / proxy
    const isSSR =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.includes("127.0.0.1") ||
      ip.includes("::ffff:127.0.0.1");

    console.log("[checkSession] 🔎 incoming:", ip, ua);
    console.log("[checkSession] 🔎 stored:", session.ipAddress, session.userAgent);
    console.log("[checkSession] isSSR =", isSSR);

    // Only enforce UA/IP lock for real browsers
    if (!isSSR) {
      if (session.userAgent !== ua || session.ipAddress !== ip) {
        console.warn("[checkSession] ❌ UA/IP mismatch (browser), deleting session");
        await prisma.session.delete({ where: { id: session.id } });
        return null;
      }
    } else {
      console.log("[checkSession] ✅ SSR mode: skipping UA/IP checks");
    }

    const permissions = Array.isArray(session.user.role?.permissions)
      ? Array.from(
          new Set(
            session.user.role.permissions.map((p: any) => p.name)
          )
        )
      : [];

    const canCommentTicket =
      permissions.includes("*") || permissions.includes("ticket.comment");

    return { ...session.user, permissions, canCommentTicket };
  } catch (err) {
    console.error("[checkSession] 💥 Unexpected error:", err);
    return null;
  }
}
