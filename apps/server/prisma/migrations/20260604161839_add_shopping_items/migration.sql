-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "updatedAt" BIGINT NOT NULL
);

-- CreateIndex
CREATE INDEX "ShoppingItem_campId_idx" ON "ShoppingItem"("campId");
