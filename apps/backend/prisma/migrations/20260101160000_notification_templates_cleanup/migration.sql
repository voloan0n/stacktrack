-- DropIndex
DROP INDEX IF EXISTS "NotificationTemplate_enabled_idx";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "ticketNumber" INTEGER;

-- Backfill ticket number for existing ticket notifications
UPDATE "Notification" n
SET "ticketNumber" = t."number"
FROM "Ticket" t
WHERE n."entityType" = 'ticket'
  AND n."entityId" = t."id"
  AND n."ticketNumber" IS NULL;

-- Normalize template type name (internal -> all notes)
UPDATE "NotificationTemplate"
SET "type" = 'ticket.note.created'
WHERE "type" = 'ticket.note.internal.created';

-- AlterTable
ALTER TABLE "NotificationTemplate" DROP COLUMN IF EXISTS "enabled",
DROP COLUMN IF EXISTS "previewTemplate";

