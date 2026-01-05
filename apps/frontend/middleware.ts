import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;

  // Protected routes
  const protectedRoutes = ["/clients", "/tickets", "/settings"];

  const pathname = req.nextUrl.pathname;

  // If user is NOT logged in & accessing protected route → redirect
  if (!session && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If user IS logged in & tries to access /login → push to tickets
  if (session && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/tickets", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clients/:path*",
    "/tickets/:path*",
    "/settings/:path*",
    "/login",
  ],
};
