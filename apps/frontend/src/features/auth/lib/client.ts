// apps/frontend/lib/auth/client.ts
import { deleteCookie } from "cookies-next";

/**
 * AUTH THROUGH PROXY
 * Frontend talks ONLY to /api/proxy/*
 * Backend stays completely hidden.
 */

export async function loginClient(email: string, password: string, remember: boolean) {
  const payload = { email, password, remember };

  console.log("🚀 [loginClient] Sending to backend via proxy:", {
    url: "/api/proxy/auth/login",
    method: "POST",
    payload,
  });

  try {
    const res = await fetch("/api/proxy/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📥 [loginClient] Raw response:", res.status);

    const data = await res.json().catch(() => ({}));

    console.log("📥 [loginClient] Response JSON:", data);

    if (!res.ok || !data.success) {
      return { success: false, message: data.message };
    }

    const user =
      data.user && typeof data.user === "object"
        ? { ...data.user, avatarColor: data.user.avatarColor || "primary", firstLogin: data.user.firstLogin }
        : null;

    return { success: true, user };
  } catch (err) {
    console.error("🔥 loginClient error:", err);
    return { success: false, message: "Server error" };
  }
}


/**
 * LOGOUT
 * Deletes the cookie (we’ll also call backend but optional)
 */
export async function logoutClient() {
  try {
    await fetch("/api/proxy/auth/logout", { method: "POST", credentials: "include" });
    deleteCookie("session", { path: "/" });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function changePasswordClient(currentPassword: string, newPassword: string) {
  try {
    const res = await fetch("/api/proxy/auth/password/change", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, message: data?.message || "Unable to update password." };
    }

    return { success: true };
  } catch {
    return { success: false, message: "Unable to update password." };
  }
}

export async function skipFirstLoginClient() {
  try {
    const res = await fetch("/api/proxy/auth/first-login/skip", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, message: data?.message || "Unable to skip first login." };
    }

    return { success: true };
  } catch {
    return { success: false, message: "Unable to skip first login." };
  }
}

/**
 * ME endpoint — get current user
 */
/**
 * ME endpoint — get current user (with DEBUG LOGGING)
 */
export async function getClientUser() {
  console.log("🔎 [getClientUser] → Sending request to /api/proxy/auth/me");

  try {
    const res = await fetch("/api/proxy/auth/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 [getClientUser] Response status:", res.status);

    const text = await res.text();
    console.log("📥 [getClientUser] Raw response body:", text);

    // Try to parse JSON only if not empty
    let data: unknown = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("⚠️ [getClientUser] Failed to parse JSON:", e);
      return null;
    }

    console.log("📦 [getClientUser] Parsed JSON:", data);

    if (!res.ok) {
      console.log("⛔ [getClientUser] Not OK → returning null");
      return null;
    }

    if (!data || typeof data !== "object" || !("user" in data)) {
      console.log("⚠️ [getClientUser] No user returned → null");
      return null;
    }

    const { user: rawUser } = data as { user?: unknown };
    if (!rawUser || typeof rawUser !== "object") {
      console.log("⚠️ [getClientUser] No user returned → null");
      return null;
    }

    const user = {
      ...(rawUser as Record<string, unknown>),
      avatarColor: (rawUser as any).avatarColor || "primary",
    };

    console.log("✅ [getClientUser] USER:", user);
    return user;
  } catch (err) {
    console.error("🔥 [getClientUser] ERROR:", err);
    return null;
  }
}
