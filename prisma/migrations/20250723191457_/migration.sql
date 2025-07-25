-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
