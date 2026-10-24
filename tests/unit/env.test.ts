import { describe, it, expect } from "vitest";
import { envSchema } from "@/lib/validation/env";

describe("Environment Validation Schema", () => {
  it("validates and sets sensible defaults for dev environment", () => {
    const parsed = envSchema.parse({});

    expect(parsed.NEXT_PUBLIC_APP_NAME).toBe("Rashed Telecom");
    expect(parsed.NEXT_PUBLIC_DEFAULT_CURRENCY).toBe("BDT");
    expect(parsed.NEXT_PUBLIC_TIMEZONE).toBe("Asia/Dhaka");
    expect(parsed.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("bn");
    expect(parsed.NODE_ENV).toBe("development");
  });

  it("accepts custom valid environment variables", () => {
    const custom = {
      NEXT_PUBLIC_APP_NAME: "Rashed Telecom Custom",
      NEXT_PUBLIC_APP_URL: "https://rashedtelecom.com",
      NEXT_PUBLIC_DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_DEFAULT_CURRENCY: "BDT",
      NEXT_PUBLIC_TIMEZONE: "Asia/Dhaka",
      NEXT_PUBLIC_SUPABASE_URL: "https://custom.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "custom-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "custom-service-key",
      DATABASE_URL: "postgresql://custom:custom@localhost:5432/custom",
      DIRECT_URL: "postgresql://custom:custom@localhost:5432/custom",
      NODE_ENV: "production",
    };

    const parsed = envSchema.parse(custom);
    expect(parsed.NEXT_PUBLIC_APP_NAME).toBe("Rashed Telecom Custom");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://rashedtelecom.com");
    expect(parsed.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("en");
    expect(parsed.NODE_ENV).toBe("production");
  });

  it("rejects invalid locale", () => {
    const invalid = {
      NEXT_PUBLIC_DEFAULT_LOCALE: "fr",
    };

    const result = envSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
