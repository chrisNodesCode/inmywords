-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "aiSuggestions" JSONB,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "autoAnalyze" BOOLEAN NOT NULL DEFAULT false;
