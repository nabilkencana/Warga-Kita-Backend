// src/profile/dto/profile.dto.ts
import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
    MinLength,
    MaxLength,
    Matches,
    IsPhoneNumber
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({ description: 'Nama lengkap user' })
    @IsOptional()
    @IsString()
    @MinLength(3)
    namaLengkap?: string;

    @ApiProperty({ description: 'Email user' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ description: 'Nomor Induk Kependudukan (16 digit)' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{16}$/, { message: 'NIK harus 16 digit angka' })
    nik?: string;

    @ApiProperty({ description: 'Tanggal lahir (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    tanggalLahir?: string;

    @ApiProperty({ description: 'Tempat lahir' })
    @IsOptional()
    @IsString()
    tempatLahir?: string;

    @ApiProperty({ description: 'Nomor telepon' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9+\-\s]+$/, { message: 'Format nomor telepon tidak valid' })
    nomorTelepon?: string;

    @ApiProperty({ description: 'Username Instagram' })
    @IsOptional()
    @IsString()
    instagram?: string;

    @ApiProperty({ description: 'Username Facebook' })
    @IsOptional()
    @IsString()
    facebook?: string;

    @ApiProperty({ description: 'Alamat lengkap' })
    @IsOptional()
    @IsString()
    @MinLength(10)
    alamat?: string;

    @ApiProperty({ description: 'Kota' })
    @IsOptional()
    @IsString()
    kota?: string;

    @ApiProperty({ description: 'Negara' })
    @IsOptional()
    @IsString()
    negara?: string;

    @ApiProperty({ description: 'Kode pos' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 digit angka' })
    kodePos?: string;

    @ApiProperty({ description: 'RT/RW' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{3}\/\d{3}$/, { message: 'Format RT/RW harus 000/000' })
    rtRw?: string;

    @ApiProperty({ description: 'Bio atau deskripsi diri' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;
  static namaLengkap: any;
  static email: any;
  static nomorTelepon: any;
  static alamat: any;
}

export class EmailChangeRequestDto {
    @ApiProperty({ description: 'Email baru' })
    @IsEmail()
    newEmail: string;
}

export class VerifyEmailChangeDto {
    @ApiProperty({ description: 'Kode OTP' })
    @IsString()
    @Matches(/^\d{6}$/, { message: 'OTP harus 6 digit angka' })
    otpCode: string;
}

export class UpdatePhoneNumberDto {
    @ApiProperty({ description: 'Nomor telepon baru' })
    @IsString()
    @Matches(/^[0-9+\-\s]+$/, { message: 'Format nomor telepon tidak valid' })
    phoneNumber: string;
}

export class UpdateBioDto {
    @ApiProperty({ description: 'Bio baru' })
    @IsString()
    @MaxLength(500)
    bio: string;
}