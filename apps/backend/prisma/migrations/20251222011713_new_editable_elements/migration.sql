/*
  Warnings:

  - You are about to drop the column `companyId` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `retainerDetails` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `KnowledgeBaseEntry` table. All the data in the column will be lost.
  - You are about to drop the column `avatarColor` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_companyId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBaseEntry" DROP CONSTRAINT "KnowledgeBaseEntry_companyId_fkey";

-- DropIndex
DROP INDEX "Client_companyId_idx";

-- DropIndex
DROP INDEX "Client_type_idx";

-- DropIndex
DROP INDEX "KnowledgeBaseEntry_companyId_idx";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "companyId",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "retainerDetails",
DROP COLUMN "type",
ADD COLUMN     "companyName" TEXT;

-- AlterTable
ALTER TABLE "KnowledgeBaseEntry" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '1 day';

-- AlterTable
ALTER TABLE "TicketStatusOption" ADD COLUMN     "colorKey" TEXT;

-- AlterTable
ALTER TABLE "TicketTypeOption" ADD COLUMN     "colorKey" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarColor",
ADD COLUMN     "accentColor" TEXT;

-- DropEnum
DROP TYPE "ClientType";

-- CreateTable
CREATE TABLE "TicketPriorityOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "colorKey" TEXT,

    CONSTRAINT "TicketPriorityOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorType" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "baseHex" TEXT NOT NULL,

    CONSTRAINT "ColorType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketPriorityOption_key_key" ON "TicketPriorityOption"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ColorType_key_key" ON "ColorType"("key");
