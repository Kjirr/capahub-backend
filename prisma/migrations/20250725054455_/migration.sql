/*
  Warnings:

  - You are about to drop the column `emailVerificationToken` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "assigneeId" TEXT,
    "winnerProviderId" TEXT,
    CONSTRAINT "PrintJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrintJob_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrintJob" ("companyId", "createdAt", "creatorId", "deadline", "description", "format", "id", "isPublic", "jobNumber", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId") SELECT "companyId", "createdAt", "creatorId", "deadline", "description", "format", "id", "isPublic", "jobNumber", "material", "quantity", "quotingDeadline", "reviewSubmitted", "status", "title", "updatedAt", "winnerProviderId" FROM "PrintJob";
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
    "assigneeId" TEXT,
    CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("comments", "companyId", "createdAt", "deliveryTime", "id", "jobId", "price", "quoteNumber", "status", "statusUpdatedAt", "submitterId") SELECT "comments", "companyId", "createdAt", "deliveryTime", "id", "jobId", "price", "quoteNumber", "status", "statusUpdatedAt", "submitterId" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "role" TEXT NOT NULL DEFAULT 'provider',
    "companyRole" TEXT NOT NULL DEFAULT 'member',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "activationToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("companyId", "companyRole", "createdAt", "email", "emailVerified", "id", "name", "passwordHash", "role", "status", "updatedAt") SELECT "companyId", "companyRole", "createdAt", "email", "emailVerified", "id", "name", "passwordHash", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_activationToken_key" ON "User"("activationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
