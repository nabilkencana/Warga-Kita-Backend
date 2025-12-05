// src/reports/dto/create-report.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUrl } from 'class-validator';

export class CreateReportDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsOptional()
    @IsNumber()
    userId?: number;

    @IsString()
    @IsOptional()
    @IsUrl() // Validasi URL
    imageUrl?: string; // ✅ TAMBAHKAN INI

    @IsString()
    @IsOptional()
    imagePublicId?: string; // ✅ TAMBAHKAN INI
}