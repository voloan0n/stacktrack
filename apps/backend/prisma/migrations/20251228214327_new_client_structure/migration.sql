/*
  Warnings:

  - You are about to drop the column `active` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the `KnowledgeBaseEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketFile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KnowledgeBaseEntry" DROP CONSTRAINT "KnowledgeBaseEntry_authorId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBaseEntry" DROP CONSTRAINT "KnowledgeBaseEntry_clientId_fkey";

-- DropForeignKey
ALTER TABLE "TicketFile" DROP CONSTRAINT "TicketFile_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketFile" DROP CONSTRAINT "TicketFile_userId_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "active",
DROP COLUMN "companyName";

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '1 day';

-- AlterTable
ALTER TABLE "TicketBillingTypeOption" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TicketSupportTypeOption" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "KnowledgeBaseEntry";

-- DropTable
DROP TABLE "TicketFile";
