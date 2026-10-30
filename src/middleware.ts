import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /app routes
  if (pathname.startsWith("/app")) {
    const sessionCookie = request.cookies.get("rt_session");

    // In production, require session cookie
    if (process.env.NODE_ENV === "production" && !sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in and visiting /login, redirect to /app
  if (pathname === "/login") {
    const sessionCookie = request.cookies.get("rt_session");
    if (sessionCookie?.value) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/login",
  ],
};
