-- AlterTable
ALTER TABLE "emergencies" ADD COLUMN     "alarmSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alarmSentAt" TIMESTAMP(3),
ADD COLUMN     "severity" "EmergencySeverity" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "emergencies_severity_idx" ON "emergencies"("severity");

-- CreateIndex
CREATE INDEX "emergencies_alarmSent_idx" ON "emergencies"("alarmSent");

-- CreateIndex
CREATE INDEX "emergencies_status_createdAt_idx" ON "emergencies"("status", "createdAt");
