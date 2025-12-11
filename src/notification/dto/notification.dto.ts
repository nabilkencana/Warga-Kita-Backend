import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsArray,
    IsJSON,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty()
    @IsNumber()
    userId: number;

    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    iconColor?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsJSON()
    data?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledAt?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relatedEntityId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relatedEntityType?: string;

    @ApiProperty()
    @IsNumber()
    createdBy: number;
}

export class BulkNotificationDto {
    @ApiProperty({ type: [Number] })
    @IsArray()
    @IsNumber({}, { each: true })
    userIds: number[];

    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    iconColor?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsJSON()
    data?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledAt?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relatedEntityId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    relatedEntityType?: string;

    @ApiProperty()
    @IsNumber()
    createdBy: number;
}

export class NotificationQueryDto {
    @ApiPropertyOptional({ enum: NotificationType })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: Date;
}

export class MarkAsReadDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notificationId?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    ids?: string[];
}