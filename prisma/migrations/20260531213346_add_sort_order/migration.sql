-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
