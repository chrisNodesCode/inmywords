-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "customValues" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "compareConfig" JSONB,
ADD COLUMN     "customFields" JSONB;
