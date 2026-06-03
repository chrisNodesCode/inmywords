-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "projectId" TEXT;

-- CreateIndex
CREATE INDEX "Message_projectId_idx" ON "Message"("projectId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
