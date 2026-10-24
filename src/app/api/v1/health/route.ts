import { NextResponse } from "next/server";
import { ApiSuccessResponse } from "@/types";
import { formatDhakaDate } from "@/lib/i18n";

export async function GET() {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const responsePayload: ApiSuccessResponse<{
    status: string;
    service: string;
    version: string;
    timezone: string;
    dhakaTime: string;
  }> = {
    data: {
      status: "healthy",
      service: "Rashed Telecom API",
      version: "1.0.0",
      timezone: "Asia/Dhaka",
      dhakaTime: formatDhakaDate(timestamp, "en", true),
    },
    meta: {
      requestId,
      timestamp,
    },
  };

  return NextResponse.json(responsePayload, { status: 200 });
}
