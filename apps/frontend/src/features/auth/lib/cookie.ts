"use server";

import { cookies } from "next/headers";

export async function setAuthToken(token: string, remember = false) {
  const maxAge = remember
    ? 30 * 24 * 60 * 60   // 30 days
    : 8 * 60 * 60;        // 8 hours  
  
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete("st_token");
}
