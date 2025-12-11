/*
  Warnings:

  - The `kkVerifiedBy` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "kkVerifiedBy",
ADD COLUMN     "kkVerifiedBy" INTEGER;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kkVerifiedBy_fkey" FOREIGN KEY ("kkVerifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
