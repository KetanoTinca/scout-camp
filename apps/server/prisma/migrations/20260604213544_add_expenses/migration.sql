-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "day" TEXT,
    "updatedAt" BIGINT NOT NULL
);

-- CreateIndex
CREATE INDEX "Expense_campId_idx" ON "Expense"("campId");
