// apps/frontend/pages/api/proxy/[...path].ts
import httpProxy from "http-proxy";
import Cookies from "cookies";

// Your backend URL (environment-based)
const API_URL = process.env.API_URL || "http://localhost:4000";

const proxy = httpProxy.createProxyServer();

export const config = {
  api: {
    bodyParser: false, // We stream the request body to backend
  },
};

export default function handler(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    const cookies = new Cookies(req, res);

    const pathSegments = Array.isArray(req.query?.path) ? req.query.path : [];
    const proxyPath = `/${pathSegments.join("/")}`;
    const search = (() => {
      try {
        return new URL(req.url || "", "http://localhost").search;
      } catch {
        return "";
      }
    })();

    // Identify login route so we can intercept the response
    const isLogin = proxyPath === "/auth/login";
    const isLogout = proxyPath === "/auth/logout";

    /** ------------------------------------
     * READ COOKIE (Browser + SSR)
     * ------------------------------------ */
    let sessionToken = cookies.get("session");

    // If SSR passed cookie manually through headers.cookie
    if (!sessionToken && req.headers.cookie) {
      const match = req.headers.cookie.match(/session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
        console.log("🔐 Proxy: Extracted session from SSR header:", sessionToken);
      }
    }

    /** ------------------------------------
     * URL Rewriting
     * ------------------------------------ */
    req.url = `/api/v1${proxyPath}${search}`;
    console.log("▶️ Proxy forwarding to:", req.url);

    // NEVER forward cookies directly to backend
    req.headers.cookie = "";

    /** ------------------------------------
     * Inject Authorization Header
     * ------------------------------------ */
    if (sessionToken) {
      req.headers["authorization"] = `Bearer ${sessionToken}`;
      console.log("🔐 Proxy: Attached Authorization header");
    } else {
      console.log("⚠️ Proxy: No session token found");
    }

    /** ------------------------------------
     * LOGIN — Intercept response
     * ------------------------------------ */
    if (isLogin) {
      proxy.once("proxyRes", (proxyRes: any, req: any, res: any) => {
        let body = "";
        proxyRes.on("data", (chunk: any) => {
          body += chunk;
        });

        proxyRes.on("end", () => {
          try {
            const json = JSON.parse(body);

            if (json.token) {
              // 🍪 Set HTTP-only cookie
              const cookies = new Cookies(req, res);
              cookies.set("session", json.token, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
              });

              console.log("🍪 Proxy: Set session cookie");

              res.status(200).json({
                success: true,
                user: json.user,
                loggedIn: true,
              });

              return resolve();
            }

            res.status(proxyRes.statusCode || 400).json(json);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    /**
     * LOGOUT — Force-clear the cookie even if backend already invalidates it
     */
    if (isLogout) {
      proxy.once("proxyRes", (proxyRes: any, req: any, res: any) => {
        const bodyChunks: any[] = [];

        proxyRes.on("data", (chunk: any) => bodyChunks.push(chunk));

        proxyRes.on("end", () => {
          // Expire the session cookie so middleware stops thinking we're logged in
          const cookies = new Cookies(req, res);
          cookies.set("session", "", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
            expires: new Date(0),
          });

          const rawBody = Buffer.concat(bodyChunks).toString();
          try {
            const json = rawBody ? JSON.parse(rawBody) : {};
            res.status(proxyRes.statusCode || 200).json(json);
          } catch {
            // If backend didn't return JSON just forward the status/text
            res.status(proxyRes.statusCode || 200).send(rawBody);
          }

          resolve();
        });
      });
    }

    proxy.once("error", (err: any) => {
      console.error("Proxy error:", err);
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: "Proxy error" });
      }
      resolve();
    });

    proxy.web(req, res, {
      target: API_URL,
      autoRewrite: false,
      selfHandleResponse: isLogin || isLogout,
    });
  });
}
