-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "isChildhoodMemory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFunctionalImpairment" BOOLEAN NOT NULL DEFAULT false;
