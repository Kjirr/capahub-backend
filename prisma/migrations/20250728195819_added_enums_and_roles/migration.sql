/*
  Warnings:

  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `companyRole` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending_approval', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('owner', 'member');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'pending_approval',
DROP COLUMN "companyRole",
ADD COLUMN     "companyRole" "CompanyRole" NOT NULL DEFAULT 'member';
