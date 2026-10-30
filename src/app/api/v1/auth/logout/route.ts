import { NextResponse } from "next/server";
import { COOKIE_SESSION_NAME } from "@/lib/auth/local-session";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "সফলভাবে লগআউট হয়েছে।",
  });

  response.cookies.set(COOKIE_SESSION_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

