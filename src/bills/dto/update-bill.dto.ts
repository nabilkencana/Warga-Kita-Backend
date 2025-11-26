// src/bills/dto/update-bill.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateBillDto } from './create-bill.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { BillStatus } from '@prisma/client'; // Gunakan dari Prisma

export class UpdateBillDto extends PartialType(CreateBillDto) {
    @IsOptional()
    @IsEnum(BillStatus)
    status?: BillStatus;
}