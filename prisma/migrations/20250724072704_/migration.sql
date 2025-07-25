-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "bedrijfsnaam" TEXT,
    "kvk" TEXT,
    "plaats" TEXT,
    "adres" TEXT,
    "postcode" TEXT,
    "telefoon" TEXT,
    "iban" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "role" TEXT NOT NULL DEFAULT 'provider',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("adres", "bedrijfsnaam", "capabilities", "createdAt", "email", "emailVerificationToken", "emailVerified", "iban", "id", "kvk", "passwordHash", "plaats", "postcode", "role", "status", "telefoon", "updatedAt") SELECT "adres", "bedrijfsnaam", "capabilities", "createdAt", "email", "emailVerificationToken", "emailVerified", "iban", "id", "kvk", "passwordHash", "plaats", "postcode", "role", "status", "telefoon", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_kvk_key" ON "User"("kvk");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
