/*
  Warnings:

  - Added the required column `offerNumber` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobNumber` to the `PrintJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quoteNumber` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerNumber" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "location" TEXT,
    "availableFrom" DATETIME,
    "availableTo" DATETIME,
    "capacityDetails" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Offer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("availableFrom", "availableTo", "capacityDetails", "createdAt", "id", "location", "machineType", "material", "ownerId", "price") SELECT "availableFrom", "availableTo", "capacityDetails", "createdAt", "id", "location", "machineType", "material", "ownerId", "price" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE UNIQUE INDEX "Offer_offerNumber_key" ON "Offer"("offerNumber");
CREATE TABLE "new_PrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "format" TEXT,
    "deadline" DATETIME,
    "quotingDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'quoting',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "reviewSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "winnerProviderId" TEXT,
    CONSTRAINT "PrintJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_winnerProviderId_fkey" FOREIGN KEY ("winnerProviderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrintJob" ("createdAt", "customerId", "deadline", "description", "format", "id", "isPublic", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId") SELECT "createdAt", "customerId", "deadline", "description", "format", "id", "isPublic", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId" FROM "PrintJob";
DROP TABLE "PrintJob";
ALTER TABLE "new_PrintJob" RENAME TO "PrintJob";
CREATE UNIQUE INDEX "PrintJob_jobNumber_key" ON "PrintJob"("jobNumber");
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "deliveryTime" TEXT NOT NULL,
    "comments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedAt" DATETIME NOT NULL,
    "jobId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("comments", "createdAt", "deliveryTime", "id", "jobId", "price", "providerId", "status", "statusUpdatedAt") SELECT "comments", "createdAt", "deliveryTime", "id", "jobId", "price", "providerId", "status", "statusUpdatedAt" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
