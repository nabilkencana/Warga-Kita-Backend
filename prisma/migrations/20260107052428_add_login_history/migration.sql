-- CreateTable
CREATE TABLE "login_histories" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_histories_userId_idx" ON "login_histories"("userId");

-- CreateIndex
CREATE INDEX "login_histories_createdAt_idx" ON "login_histories"("createdAt");

-- AddForeignKey
ALTER TABLE "login_histories" ADD CONSTRAINT "login_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
