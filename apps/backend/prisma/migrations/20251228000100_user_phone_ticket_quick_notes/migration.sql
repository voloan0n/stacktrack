-- Add optional phone number to users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Add quick notes field to tickets (short sidebar notes)
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "quickNotes" TEXT;

