// src/bills/interfaces/bill.interface.ts
import { BillStatus as PrismaBillStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

// Export Prisma enum langsung
export { PrismaBillStatus as BillStatus };

export interface IBill {
    id: string;
    title: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: PrismaBillStatus; // Gunakan Prisma enum
    userId: number;
    createdBy: number;
    paymentId?: number;
    paidAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        id: number;
        namaLengkap: string;
        email: string;
    };
    createdByUser?: {
        id: number;
        namaLengkap: string;
        email: string;
    };
    payment?: {
        id: number;
        method: PaymentMethod;
        status: PaymentStatus;
        paidDate?: Date;
    };
}

export interface IBillCreate {
    title: string;
    description: string;
    amount: number;
    dueDate: Date;
    userId: number;
    createdBy: number;
}

export interface IBillUpdate {
    title?: string;
    description?: string;
    amount?: number;
    dueDate?: Date;
    status?: PrismaBillStatus; // Gunakan Prisma enum
}

export interface IBillSummary {
    totalBills: number;
    pendingBills: number;
    paidBills: number;
    overdueBills: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
}

// Hapus custom enum yang duplicate
// export enum BillStatus {
//   PENDING = 'PENDING',
//   PAID = 'PAID',
//   OVERDUE = 'OVERDUE',
//   CANCELLED = 'CANCELLED',
// }