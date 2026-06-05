-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "updatedAt" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "MenuEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servingsOverride" INTEGER,
    "updatedAt" BIGINT NOT NULL
);

-- CreateIndex
CREATE INDEX "MenuEntry_campId_idx" ON "MenuEntry"("campId");
