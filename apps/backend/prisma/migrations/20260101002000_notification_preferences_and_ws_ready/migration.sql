-- Add user notification preferences and upgrade notifications to a persistent readAt model.

-- 1) NotificationPreferences table (one row per user)
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "onTicketCreated" BOOLEAN NOT NULL DEFAULT true,
    "onTicketAssigned" BOOLEAN NOT NULL DEFAULT true,
    "onStatusUpdate" BOOLEAN NOT NULL DEFAULT true,
    "onInternalNote" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

ALTER TABLE "NotificationPreferences"
ADD CONSTRAINT "NotificationPreferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Upgrade Notification table
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_ticketId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

UPDATE "Notification"
SET "readAt" = "createdAt"
WHERE "read" = true AND "readAt" IS NULL;

ALTER TABLE "Notification" RENAME COLUMN "message" TO "body";

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

UPDATE "Notification"
SET "entityType" = CASE WHEN "ticketId" IS NOT NULL THEN 'ticket' ELSE 'unknown' END
WHERE "entityType" IS NULL;

UPDATE "Notification"
SET "entityId" = COALESCE("ticketId", "id")
WHERE "entityId" IS NULL;

-- Convert enum type to string
ALTER TABLE "Notification"
ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Backfill required values before tightening constraints
UPDATE "Notification" SET "title" = 'Notification' WHERE "title" IS NULL;
UPDATE "Notification" SET "body" = '' WHERE "body" IS NULL;
DELETE FROM "Notification" WHERE "userId" IS NULL;

ALTER TABLE "Notification" DROP COLUMN IF EXISTS "read";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "pinned";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "channel";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "meta";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "ticketId";

ALTER TABLE "Notification" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "entityType" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "entityId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "body" SET NOT NULL;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_readAt_idx" ON "Notification"("readAt");

-- Optional: clean up unused enum types if no longer referenced
DROP TYPE IF EXISTS "NotificationChannel";
DROP TYPE IF EXISTS "NotificationType";

