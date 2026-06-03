-- Baseline catch-up: these changes were previously applied to the live database
-- with `prisma db push` and are being folded back into migration history so the
-- migrations directory once again reproduces the live schema. This migration is
-- recorded as already-applied (via `prisma migrate resolve --applied`); the SQL
-- below is for fresh databases / shadow replays only.

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "draft" TEXT NOT NULL,
    "response" TEXT,
    "finalDraft" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
