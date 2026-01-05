import { cookies } from "next/headers";

function getServerBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3000";
}

/**
 * SERVER side: Fetch user through proxy
 * Must forward the HTTP-only cookie manually.
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    const base = getServerBaseUrl();
    const url = `${base}/api/proxy/auth/me`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: session ? `session=${session}` : "",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.user) return null;

    return {
      ...data.user,
      avatarColor: data.user.avatarColor || "primary",
      firstLogin: data.user.firstLogin,
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("getServerUser failed:", err);
    }
    return null;
  }
}
