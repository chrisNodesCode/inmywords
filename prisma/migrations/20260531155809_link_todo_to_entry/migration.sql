-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "entryId" TEXT;

-- CreateIndex
CREATE INDEX "Todo_entryId_idx" ON "Todo"("entryId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
