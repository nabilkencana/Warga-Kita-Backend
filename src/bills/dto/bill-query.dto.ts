// src/bills/dto/bill-query.dto.ts
import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { BillStatus } from '@prisma/client';

export class BillQueryDto {
    @IsOptional()
    @IsEnum(BillStatus)
    status?: BillStatus;

    @IsOptional()
    @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
    @IsInt()
    @Min(1)
    userId?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10) || 1)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10) || 10)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}