-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "admin_dashboards" ADD COLUMN     "overdueBills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidBills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingBills" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalBills" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "userId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_paymentId_key" ON "bills"("paymentId");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
