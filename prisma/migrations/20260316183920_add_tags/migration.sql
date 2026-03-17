-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "aiConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiSuggestedTags" TEXT[],
ADD COLUMN     "tags" TEXT[];
