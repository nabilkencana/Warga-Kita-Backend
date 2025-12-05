-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kkRejectionReason" TEXT,
ADD COLUMN     "kkVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "kkVerifiedBy" TEXT;
