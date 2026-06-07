-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "address" TEXT,
ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "distance" DOUBLE PRECISION,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "enabledFields" TEXT[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "noteFields" TEXT[];
