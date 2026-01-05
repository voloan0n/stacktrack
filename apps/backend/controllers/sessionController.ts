import { prisma } from "../config/prisma";
import type { Reply, Request } from "../lib/http";
import { checkSession } from "../lib/session";

export const SessionController = {
  // ============================================================
  // LIST SESSIONS (current user)
  // ============================================================
  async listSessions(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expires: true,
        createdAt: true,
      },
    });

    return reply.send({ sessions });
  },

  // ============================================================
  // REVOKE SESSION (current user)
  // ============================================================
  async revokeSession(request: Request, reply: Reply) {
    const user = await checkSession(request);
    if (!user) return reply.code(401).send({ message: "Unauthorized" });

    const { sessionId } = request.params;

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!session) {
      return reply.code(404).send({ message: "Session not found" });
    }

    await prisma.session.delete({ where: { id: sessionId } });

    return reply.send({ success: true });
  },
};
