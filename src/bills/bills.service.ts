// src/bills/bills.service.ts
import { Injectable, NotFoundException, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillQueryDto } from './dto/bill-query.dto';
import { IBill, IBillCreate, IBillSummary } from './interfaces/bill.interface';
import { PaymentMethod, PaymentStatus, BillStatus } from '@prisma/client';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(private prisma: PrismaService) { }

  async create(createBillDto: CreateBillDto, createdBy: number): Promise<IBill> {
    try {
      console.log('🔄 Creating bill with createdBy:', createdBy);

      // Validasi bahwa user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createBillDto.userId },
      });

      if (!user) {
        throw new BadRequestException(`User with ID ${createBillDto.userId} not found`);
      }

      // Gunakan UncheckedCreate untuk menghindari relation complexity
      const billData = {
        title: createBillDto.title,
        description: createBillDto.description,
        amount: createBillDto.amount,
        dueDate: new Date(createBillDto.dueDate),
        userId: createBillDto.userId, // Langsung assign userId
        createdBy: createdBy, // Langsung assign createdBy
      };

      console.log('📝 Bill data to create:', billData);

      const bill = await this.prisma.bill.create({
        data: billData,
        include: {
          user: {
            select: {
              id: true,
              namaLengkap: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              namaLengkap: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`✅ Bill created successfully: ${bill.id}`);
      return bill as IBill;
    } catch (error) {
      this.logger.error('❌ Error creating bill:', error);

      if (error.code === 'P2003') {
        throw new BadRequestException('Foreign key constraint failed - User not found');
      }

      throw error;
    }
  }

  async findAll(filters: BillQueryDto): Promise<{
    bills: IBill[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const {
      status,
      userId,
      page = 1,
      limit = 10,
    } = filters;

    // Convert string parameters to numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    const where: any = {};

    if (status) where.status = status;
    if (userId) {
      where.userId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    }

    const skip = (pageNum - 1) * limitNum;

    console.log('🔍 Bills query:', { where, skip, take: limitNum, pageNum, limitNum });

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              namaLengkap: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              namaLengkap: true,
              email: true,
            },
          },
          payment: true,
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limitNum, // Sekarang number
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      bills: bills as IBill[],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string): Promise<IBill> {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
            nomorTelepon: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
        payment: true,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${id} not found`);
    }

    return bill as IBill;
  }

  async update(id: string, updateBillDto: UpdateBillDto): Promise<IBill> {
    const existingBill = await this.findOne(id);

    const updateData: any = { ...updateBillDto };

    const bill = await this.prisma.bill.update({
      where: { id  },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
        payment: true,
      },
    });

    this.logger.log(`Bill updated: ${bill.id}`);
    return bill as IBill;
  }

  async remove(id: string): Promise<void> {
    const bill = await this.findOne(id);

    await this.prisma.bill.delete({
      where: { id },
    });

    this.logger.log(`Bill deleted: ${id}`);
  }

  async getUserBills(userId: number, filters?: BillQueryDto): Promise<{
    bills: IBill[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    // Convert userId ke number jika perlu
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    return this.findAll({
      ...filters,
      userId: userIdNum,
    });
  }

  async payBill(billId: string, paymentData: {
    method: string;
    paidDate?: Date;
    receiptImage?: string;
  }): Promise<IBill> {
    const bill = await this.findOne(billId);

    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('Bill already paid');
    }

    if (bill.status === BillStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay cancelled bill');
    }

    // Convert string method to PaymentMethod enum
    let paymentMethod: PaymentMethod;
    try {
      paymentMethod = this.convertToPaymentMethod(paymentData.method);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        amount: bill.amount,
        method: paymentMethod,
        status: PaymentStatus.PAID,
        description: `Payment for bill: ${bill.title}`,
        dueDate: bill.dueDate,
        paidDate: paymentData.paidDate || new Date(),
        receiptImage: paymentData.receiptImage,
        userId: bill.userId,
      },
    });

    // Update bill status and link to payment
    const updatedBill = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        status: BillStatus.PAID,
        paymentId: payment.id,
        paidAt: paymentData.paidDate || new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          },
        },
        payment: true,
      },
    });

    // Create transaction record for the income
    await this.prisma.transaction.create({
      data: {
        amount: bill.amount,
        type: 'INCOME',
        category: 'Iuran',
        description: `Pembayaran: ${bill.title}`,
        date: new Date(),
        createdBy: bill.createdBy,
        userId: bill.userId,
        paymentId: payment.id,
      },
    });

    this.logger.log(`Bill paid: ${billId} by user ${bill.userId}`);
    return updatedBill as IBill;
  }

  async getSummary(userId?: number): Promise<IBillSummary> {
    const where: any = {};

    // Convert userId ke number jika perlu
    if (userId) {
      where.userId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    }

    const [
      totalBills,
      pendingBills,
      paidBills,
      overdueBills,
      totalAmountResult,
      pendingAmountResult,
      paidAmountResult,
    ] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.count({ where: { ...where, status: BillStatus.PENDING } }),
      this.prisma.bill.count({ where: { ...where, status: BillStatus.PAID } }),
      this.prisma.bill.count({ where: { ...where, status: BillStatus.OVERDUE } }),
      this.prisma.bill.aggregate({  
        where,
        _sum: { amount: true },
      }),
      this.prisma.bill.aggregate({
        where: { ...where, status: BillStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.bill.aggregate({
        where: { ...where, status: BillStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalBills,
      pendingBills,
      paidBills,
      overdueBills,
      totalAmount: totalAmountResult._sum.amount || 0,
      pendingAmount: pendingAmountResult._sum.amount || 0,
      paidAmount: paidAmountResult._sum.amount || 0,
    };
  }

  async updateOverdueBills(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.bill.updateMany({
      where: {
        status: BillStatus.PENDING,
        dueDate: { lt: now },
      },
      data: {
        status: BillStatus.OVERDUE,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Updated ${result.count} bills to OVERDUE status`);
    }
  }

  private convertToPaymentMethod(method: string): PaymentMethod {
    const upperMethod = method.toUpperCase();

    switch (upperMethod) {
      case 'CASH':
        return PaymentMethod.CASH;
      case 'QRIS':
        return PaymentMethod.QRIS;
      case 'MOBILE_BANKING':
        return PaymentMethod.MOBILE_BANKING;
      case 'BANK_TRANSFER':
        return PaymentMethod.BANK_TRANSFER;
      default:
        throw new BadRequestException(`Invalid payment method: ${method}`);
    }
  }
}