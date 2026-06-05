-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "updatedAt" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "ShopPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "packageSize" REAL NOT NULL,
    "packagePrice" REAL NOT NULL,
    "updatedAt" BIGINT NOT NULL
);

-- CreateIndex
CREATE INDEX "ShopPrice_ingredientId_idx" ON "ShopPrice"("ingredientId");
