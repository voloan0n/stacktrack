-- Add status SLA field
ALTER TABLE "TicketStatusOption"
ADD COLUMN IF NOT EXISTS "nextActionDueHours" INTEGER;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Support type options (for ticket notes/worklogs)
CREATE TABLE IF NOT EXISTS "TicketSupportTypeOption" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "TicketSupportTypeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TicketSupportTypeOption_key_key"
ON "TicketSupportTypeOption"("key");

-- Billing type options (for timeline metadata / UI selection)
CREATE TABLE IF NOT EXISTS "TicketBillingTypeOption" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "TicketBillingTypeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TicketBillingTypeOption_key_key"
ON "TicketBillingTypeOption"("key");
