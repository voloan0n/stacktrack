import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { prisma } from "../../config/prisma";
import jwt from "jsonwebtoken";
import { trackSocket } from "./wsHub";

function getBearerToken(req: IncomingMessage) {
  const auth = req.headers["authorization"];
  if (!auth) return null;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim();
}

async function authenticateWs(req: IncomingMessage) {
  const token = getBearerToken(req);
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    jwt.verify(token, secret);
  } catch {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expires < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export function attachNotificationWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      if (url.pathname !== "/api/v1/ws/notifications") return;

      const user = await authenticateWs(req);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws: any) => {
        trackSocket(user.id, ws);
        ws.send(JSON.stringify({ event: "ready" }));
      });
    } catch {
      socket.destroy();
    }
  });

  return wss;
}
