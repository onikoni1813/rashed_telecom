-- AlterTable
ALTER TABLE "service_jobs" ADD COLUMN IF NOT EXISTS "screen_lock_type" TEXT DEFAULT 'NONE';
ALTER TABLE "service_jobs" ADD COLUMN IF NOT EXISTS "device_passcode" TEXT;

