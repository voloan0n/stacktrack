import type { IncomingMessage } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import httpProxy from "http-proxy";

const API_URL = process.env.API_URL || "http://localhost:4000";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const proxy = httpProxy.createProxyServer({
  target: API_URL,
  ws: true,
  changeOrigin: true,
});

function getCookieValue(req: IncomingMessage, name: string) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Attach upgrade handler once per Next.js server instance.
  const server: any = (res.socket as any)?.server;
  if (!server) {
    res.status(500).json({ ok: false });
    return;
  }

  if (!server.__notificationsWsProxyAttached) {
    server.__notificationsWsProxyAttached = true;

    server.on("upgrade", (req: IncomingMessage, socket: any, head: any) => {
      try {
        const url = new URL(req.url || "", "http://localhost");
        if (url.pathname !== "/api/ws/notifications") return;

        const sessionToken = getCookieValue(req, "session");
        if (sessionToken) {
          req.headers["authorization"] = `Bearer ${sessionToken}`;
        }

        req.url = "/api/v1/ws/notifications";
        proxy.ws(req as any, socket, head);
      } catch {
        socket.destroy();
      }
    });
  }

  res.status(200).end();
}

