// src/bills/dto/create-bill.dto.ts
import { IsString, IsNumber, IsDateString, IsInt, Min } from 'class-validator';

export class CreateBillDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsDateString()
    dueDate: string;

    @IsInt()
    @Min(1)
    userId: number;

}