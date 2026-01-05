import { cookies } from "next/headers";

/**
 * loadUser() is for server components & layouts.
 * Must read HTTP-only cookie manually and forward it.
 */
export async function loadUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    const url = `${process.env.NEXT_PUBLIC_APP_PROTOCOL}://${process.env.NEXT_PUBLIC_APP_DOMAIN}/api/proxy/auth/me`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: session ? `session=${session}` : "",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data: unknown = await res.json().catch(() => null);

    if (!data || typeof data !== "object" || !("user" in data)) return null;

    const { user: rawUser } = data as { user?: unknown };

    if (!rawUser || typeof rawUser !== "object") return null;

    return {
      ...(rawUser as Record<string, unknown>),
      avatarColor: (rawUser as any).avatarColor || "primary",
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("loadUser failed:", err);
    }
    return null;
  }
}
