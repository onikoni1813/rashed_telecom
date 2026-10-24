import { z } from "zod";

export const envSchema = z.object({
  // App settings
  NEXT_PUBLIC_APP_NAME: z.string().default("Rashed Telecom"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["bn", "en"]).default("bn"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default("BDT"),
  NEXT_PUBLIC_TIMEZONE: z.string().default("Asia/Dhaka"),

  // Supabase Auth
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("placeholder-service-role-key"),

  // Database
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/postgres"),
  DIRECT_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/postgres"),

  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const formattedErrors = result.error.format();
      console.error("Invalid environment variables:", JSON.stringify(formattedErrors, null, 2));
      throw new Error("Invalid application environment configuration.");
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}
