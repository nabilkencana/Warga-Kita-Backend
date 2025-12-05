// src/reports/reports.controller.ts
import {
    Controller, Get, Post, Put, Delete, Body,
    Param, Query, UseInterceptors, UploadedFile,
    UseGuards,
    BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    // Create report dengan file upload
    @Post()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('imageFile', {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB max
        },
        fileFilter: (req, file, cb) => {
            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/jpg',
                'image/gif',
            ];

            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(
                    new BadRequestException(
                        'Format file tidak didukung. Gunakan JPG, PNG, atau GIF',
                    ),
                    false,
                );
            }
        },
    }))
    async create(
        @Body() createReportDto: CreateReportDto,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        console.log('📥 Received DTO:', createReportDto);
        console.log('📁 Has imageFile?:', !!imageFile);
        console.log('🔗 imageUrl in DTO:', createReportDto.imageUrl); // Jika ada
        
        return this.reportsService.create({
            ...createReportDto,
            imageFile,
        });
    }

    // Get all reports dengan pagination dan search
    @Get()
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search?: string,
    ) {
        return this.reportsService.findAll(
            parseInt(page),
            parseInt(limit),
            search,
        );
    }

    // Get report by ID
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.reportsService.findOne(parseInt(id));
    }

    // Update report dengan file upload
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('imageFile', {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/jpg',
                'image/gif',
            ];

            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(
                    new BadRequestException(
                        'Format file tidak didukung. Gunakan JPG, PNG, atau GIF',
                    ),
                    false,
                );
            }
        },
    }))
    async update(
        @Param('id') id: string,
        @Body() updateReportDto: UpdateReportDto,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        return this.reportsService.update(parseInt(id), {
            ...updateReportDto,
            imageFile,
        });
    }

    // Delete report
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        return this.reportsService.remove(parseInt(id));
    }

    // Update report status
    @Put(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string },
    ) {
        return this.reportsService.updateStatus(parseInt(id), body.status);
    }

    // Get reports by category
    @Get('category/:category')
    async findByCategory(
        @Param('category') category: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reportsService.findByCategory(
            category,
            parseInt(page),
            parseInt(limit),
        );
    }

    // Get reports by status
    @Get('status/:status')
    async findByStatus(
        @Param('status') status: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reportsService.findByStatus(
            status,
            parseInt(page),
            parseInt(limit),
        );
    }

    // Search reports
    @Get('search/:keyword')
    async searchByTitle(
        @Param('keyword') keyword: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reportsService.searchByTitle(
            keyword,
            parseInt(page),
            parseInt(limit),
        );
    }

    // Get report statistics
    @Get('stats/summary')
    async getReportStats() {
        return this.reportsService.getReportStats();
    }

    // Get reports by user ID
    @Get('user/:userId')
    @UseGuards(JwtAuthGuard)
    async findByUserId(
        @Param('userId') userId: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.reportsService.findByUserId(
            parseInt(userId),
            parseInt(page),
            parseInt(limit),
        );
    }
}