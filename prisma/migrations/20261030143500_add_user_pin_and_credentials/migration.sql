-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_hash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_salt" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "device_name" TEXT DEFAULT 'Biometric Device',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_credentials_credential_id_key" UNIQUE ("credential_id"),
    CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_credentials_user_id_idx" ON "user_credentials"("user_id");

