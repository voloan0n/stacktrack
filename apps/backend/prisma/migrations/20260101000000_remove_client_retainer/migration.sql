-- Remove unused client retainer flag
ALTER TABLE "Client" DROP COLUMN IF EXISTS "retainer";

