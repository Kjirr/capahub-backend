-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "winnerProviderId" TEXT,
    "format" TEXT,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'quoting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "PrintJob_winnerProviderId_fkey" FOREIGN KEY ("winnerProviderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PrintJob" ("createdAt", "customerId", "deadline", "description", "format", "id", "material", "quantity", "status", "title", "updatedAt") SELECT "createdAt", "customerId", "deadline", "description", "format", "id", "material", "quantity", "status", "title", "updatedAt" FROM "PrintJob";
DROP TABLE "PrintJob";
ALTER TABLE "new_PrintJob" RENAME TO "PrintJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
