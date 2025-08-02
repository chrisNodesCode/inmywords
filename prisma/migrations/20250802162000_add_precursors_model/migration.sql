-- AlterTable
ALTER TABLE "public"."Notebook" ADD COLUMN     "precursorId" TEXT;

-- CreateTable
CREATE TABLE "public"."Precursor" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pattern" JSONB NOT NULL,
    "modelData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Precursor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Notebook" ADD CONSTRAINT "Notebook_precursorId_fkey" FOREIGN KEY ("precursorId") REFERENCES "public"."Precursor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

