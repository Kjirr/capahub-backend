/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `PrintJob` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `adres` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bedrijfsnaam` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `capabilities` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `iban` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `kvk` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `plaats` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `postcode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `telefoon` on the `User` table. All the data in the column will be lost.
  - Added the required column `companyId` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `PrintJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `PrintJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submitterId` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kvk" TEXT NOT NULL,
    "plaats" TEXT,
    "adres" TEXT,
    "postcode" TEXT,
    "telefoon" TEXT,
    "iban" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
    "companyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Offer_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("availableFrom", "availableTo", "capacityDetails", "createdAt", "id", "location", "machineType", "material", "offerNumber", "price") SELECT "availableFrom", "availableTo", "capacityDetails", "createdAt", "id", "location", "machineType", "material", "offerNumber", "price" FROM "Offer";
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
    "companyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "winnerProviderId" TEXT,
    CONSTRAINT "PrintJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PrintJob" ("createdAt", "deadline", "description", "format", "id", "isPublic", "jobNumber", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId") SELECT "createdAt", "deadline", "description", "format", "id", "isPublic", "jobNumber", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId" FROM "PrintJob";
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
    "companyId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("comments", "createdAt", "deliveryTime", "id", "jobId", "price", "quoteNumber", "status", "statusUpdatedAt") SELECT "comments", "createdAt", "deliveryTime", "id", "jobId", "price", "quoteNumber", "status", "statusUpdatedAt" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("comment", "createdAt", "id", "jobId", "rating") SELECT "comment", "createdAt", "id", "jobId", "rating" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "role" TEXT NOT NULL DEFAULT 'provider',
    "companyRole" TEXT NOT NULL DEFAULT 'member',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerificationToken", "emailVerified", "id", "passwordHash", "role", "status", "updatedAt") SELECT "createdAt", "email", "emailVerificationToken", "emailVerified", "id", "passwordHash", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Company_kvk_key" ON "Company"("kvk");
