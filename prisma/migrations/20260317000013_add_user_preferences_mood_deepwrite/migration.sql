-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "mood" TEXT;

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accent" TEXT NOT NULL DEFAULT 'slate',
    "font" TEXT NOT NULL DEFAULT 'noto',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "deepWriteDefault" BOOLEAN NOT NULL DEFAULT false,
    "editorFontSize" INTEGER NOT NULL DEFAULT 17,
    "editorLineWidth" TEXT NOT NULL DEFAULT 'mid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");
