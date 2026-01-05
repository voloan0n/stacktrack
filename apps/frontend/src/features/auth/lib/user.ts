"use server";

import { cookies } from "next/headers";

function getServerBaseUrl() {
  // Production deployment environments
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Local dev fallback
  return "http://127.0.0.1:3000";
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const base = getServerBaseUrl();
  const url = `${base}/api/proxy/auth/me`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        cookie: `session=${token}`,
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
  } catch {
    return null;
  }
}
