console.log("🔥 FASTIFY SERVER STARTED — LOGGING WORKS");

import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { prisma } from "./config/prisma";
import { registerRoutes } from "./routes";
import { attachNotificationWebSocket } from "./lib/notifications/wsServer";
import { ensureDefaultNotificationTemplates } from "./lib/notifications/templateService";

dotenv.config();

// =========================================================
// CONFIG
// =========================================================
const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const appProtocol = process.env.APP_PROTOCOL || (isProd ? "https" : "http");
const appDomain = process.env.APP_DOMAIN || "localhost";
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || appDomain;
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedHosts = new Set(
  allowedOrigins
    .map((o) => o.replace(/^https?:\/\//i, "").replace(/\/+$/, ""))
    .concat(appDomain)
);

// =========================================================
// INITIALIZE FASTIFY
// =========================================================
const fastify = Fastify({
  logger: process.env.NODE_ENV !== "production",
  trustProxy: true,
});

// =========================================================
// REGISTER PLUGINS
// =========================================================
fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser clients
    if (!isProd) return cb(null, true);

    const normalized = origin.replace(/\/+$/, "");
    const domainOnly = normalized.replace(/^https?:\/\//i, "");
    if (allowedOrigins.some((o) => normalized === o) || allowedHosts.has(domainOnly)) {
      return cb(null, true);
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// =========================================================
// SECURITY MIDDLEWARE
// =========================================================
fastify.addHook("onRequest", async (request, reply) => {
  if (isProd) {
    const proto = request.headers["x-forwarded-proto"] || request.protocol;
    if (String(proto).toLowerCase() !== "https") {
      return reply.code(426).send({ error: "HTTPS required in production" });
    }

    const host = (request.headers.host || "").toLowerCase().split(":")[0];
    if (host && !allowedHosts.has(host)) {
      return reply.code(400).send({ error: "Host not allowed" });
    }
  }

  // Enforce configured protocol for downstream logic
  (request as any).appProtocol = appProtocol;
});

// =========================================================
// ROUTES
// =========================================================
fastify.register(registerRoutes);
attachNotificationWebSocket(fastify.server);

// =========================================================
// STARTUP
// =========================================================
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL!");
    await ensureDefaultNotificationTemplates();

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Backend running on port ${PORT}`);
  } catch (err) {
    console.error("❌ Startup failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
