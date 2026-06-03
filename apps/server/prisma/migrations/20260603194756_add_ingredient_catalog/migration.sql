-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "category" TEXT,
    "stockQty" REAL NOT NULL DEFAULT 0,
    "updatedAt" BIGINT NOT NULL
);
