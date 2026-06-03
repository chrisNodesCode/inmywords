-- CreateTable
CREATE TABLE "MessagePreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessagePreset_userId_idx" ON "MessagePreset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessagePreset_userId_key_key" ON "MessagePreset"("userId", "key");
