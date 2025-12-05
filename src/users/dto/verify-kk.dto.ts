import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

// src/users/dto/verify-kk.dto.ts
export class VerifyKKDto {
    @IsBoolean()
    isApproved: boolean;

    @IsOptional()
    @IsString()
    @MinLength(10, { message: 'Alasan minimal 10 karakter' })
    rejectionReason?: string;
}