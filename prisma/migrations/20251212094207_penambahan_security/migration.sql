-- CreateEnum
CREATE TYPE "SecurityShift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "SecurityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDLING', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SecurityAction" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'PATROL_START', 'PATROL_END', 'EMERGENCY_RESPONSE', 'LOCATION_UPDATE', 'STATUS_CHANGE', 'INCIDENT_REPORT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SOS_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'PATROL';

-- CreateTable
CREATE TABLE "security_personnel" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nomorTelepon" TEXT NOT NULL,
    "shift" "SecurityShift" NOT NULL DEFAULT 'MORNING',
    "status" "SecurityStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOnDuty" BOOLEAN NOT NULL DEFAULT false,
    "currentLatitude" TEXT,
    "currentLongitude" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "deviceToken" TEXT,
    "emergencyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_responses" (
    "id" SERIAL NOT NULL,
    "emergencyId" INTEGER NOT NULL,
    "securityId" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'DISPATCHED',
    "actionTaken" TEXT,
    "notes" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" SERIAL NOT NULL,
    "securityId" INTEGER NOT NULL,
    "action" "SecurityAction" NOT NULL,
    "details" TEXT,
    "location" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SecurityNotifications" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SecurityNotifications_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_personnel_nik_key" ON "security_personnel"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "security_personnel_email_key" ON "security_personnel"("email");

-- CreateIndex
CREATE INDEX "security_personnel_shift_idx" ON "security_personnel"("shift");

-- CreateIndex
CREATE INDEX "security_personnel_status_idx" ON "security_personnel"("status");

-- CreateIndex
CREATE INDEX "security_personnel_isOnDuty_idx" ON "security_personnel"("isOnDuty");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_responses_emergencyId_securityId_key" ON "emergency_responses"("emergencyId", "securityId");

-- CreateIndex
CREATE INDEX "security_logs_securityId_idx" ON "security_logs"("securityId");

-- CreateIndex
CREATE INDEX "security_logs_action_idx" ON "security_logs"("action");

-- CreateIndex
CREATE INDEX "security_logs_timestamp_idx" ON "security_logs"("timestamp");

-- CreateIndex
CREATE INDEX "_SecurityNotifications_B_index" ON "_SecurityNotifications"("B");

-- AddForeignKey
ALTER TABLE "emergency_responses" ADD CONSTRAINT "emergency_responses_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "emergencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_responses" ADD CONSTRAINT "emergency_responses_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SecurityNotifications" ADD CONSTRAINT "_SecurityNotifications_A_fkey" FOREIGN KEY ("A") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SecurityNotifications" ADD CONSTRAINT "_SecurityNotifications_B_fkey" FOREIGN KEY ("B") REFERENCES "security_personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
