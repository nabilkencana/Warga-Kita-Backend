// src/reports/reports.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService, CloudinaryUploadResult } from '../cloudinary/cloudinary.service';

@Injectable()
export class ReportsService {
    constructor(
        private prisma: PrismaService,
        private cloudinaryService: CloudinaryService,
    ) { }

    //   new report dengan Cloudinary upload
    async create(data: {
        title: string;
        description: string;
        category: string;
        imageFile?: Express.Multer.File;
        imageUrl?: string; // ✅ Terima URL dari frontend
        imagePublicId?: string; // ✅ Terima publicId
        userId?: number;
    }) {
        try {
            let cloudinaryResult: CloudinaryUploadResult | null = null;

            // Handle file upload ke Cloudinary jika ada
            if (data.imageFile) {
                const validation = this.cloudinaryService.validateFile(data.imageFile);
                if (!validation.isValid) {
                    throw new BadRequestException(validation.error);
                }

                // Upload file ke Cloudinary
                cloudinaryResult = await this.cloudinaryService.uploadFile(
                    data.imageFile,
                    'reports',
                );
                console.log('📁 Report image uploaded to Cloudinary:', cloudinaryResult.url);
            }
            // JIKA TIDAK ADA FILE TAPI ADA imageUrl, gunakan URL yang diberikan
            else if (data.imageUrl) {
                console.log('📁 Menggunakan imageUrl yang diberikan:', data.imageUrl);
                // Langsung gunakan URL dari frontend
                const inferredFormat = (() => {
                    try {
                        const urlParts = data.imageUrl.split('?')[0].split('.');
                        const ext = urlParts[urlParts.length - 1].toLowerCase();
                        return ext || 'jpg';
                    } catch {
                        return 'jpg';
                    }
                })();
                cloudinaryResult = {
                    url: data.imageUrl,
                    public_id: data.imagePublicId || `reports/${Date.now()}`,
                    format: inferredFormat,
                    bytes: 0,
                    created_at: new Date().toISOString(),
                };
            }

            // Prepare data untuk database
            const createData: any = {
                title: data.title,
                description: data.description,
                category: data.category,
                status: 'PENDING',
            };

            // Tambahkan URL gambar dari Cloudinary jika ada
            if (cloudinaryResult) {
                createData.imageUrl = cloudinaryResult.url;
                createData.imagePublicId = cloudinaryResult.public_id;
            }

            // Handle userId - convert ke number atau undefined
            if (data.userId !== undefined && data.userId !== null) {
                createData.userId = Number(data.userId);
            }

            const report = await this.prisma.report.create({
                data: createData,
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                }
            });

            // Notifikasi atau log
            console.log(`📋 Laporan baru dibuat: ${report.title} (ID: ${report.id})`);

            return report;
        } catch (error) {
            console.error('Error creating report:', error);

            // Rollback: Hapus file dari Cloudinary jika upload gagal
            if (data.imageFile && error instanceof Error) {
                try {
                    console.log('🔄 Rollback: Menghapus file dari Cloudinary karena pembuatan laporan gagal');
                } catch (rollbackError) {
                    console.error('Error saat rollback file:', rollbackError);
                }
            }

            throw new BadRequestException('Gagal membuat laporan: ' + error.message);
        }
    }

    // Get all reports dengan informasi user
    async findAll(page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;

        const whereCondition = search ? {
            OR: [
                { title: { contains: search } },
                { description: { contains: search } },
                { category: { contains: search } },
            ],
        } : {};

        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where: whereCondition,
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.report.count({ where: whereCondition }),
        ]);

        return {
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Get report by ID dengan informasi user
    async findOne(id: number) {
        const report = await this.prisma.report.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        email: true,
                        nomorTelepon: true,
                    }
                }
            }
        });

        if (!report) {
            throw new NotFoundException(`Laporan dengan ID ${id} tidak ditemukan`);
        }

        return report;
    }

    // Update report dengan Cloudinary upload
    async update(id: number, data: {
        title?: string;
        description?: string;
        category?: string;
        imageFile?: Express.Multer.File;
    }) {
        try {
            // Check if report exists
            const existingReport = await this.prisma.report.findUnique({
                where: { id },
                select: {
                    id: true,
                    imagePublicId: true
                }
            });

            if (!existingReport) {
                throw new NotFoundException(`Laporan dengan ID ${id} tidak ditemukan`);
            }

            // Prepare update data
            const updateData: any = {};

            if (data.title) updateData.title = data.title;
            if (data.description) updateData.description = data.description;
            if (data.category) updateData.category = data.category;

            // Handle file upload jika ada file baru
            if (data.imageFile) {
                const validation = this.cloudinaryService.validateFile(data.imageFile);
                if (!validation.isValid) {
                    throw new BadRequestException(validation.error);
                }

                // Hapus gambar lama dari Cloudinary jika ada
                if (existingReport.imagePublicId) {
                    try {
                        await this.cloudinaryService.deleteFile(existingReport.imagePublicId);
                        console.log('🗑️ Gambar lama dihapus dari Cloudinary');
                    } catch (error) {
                        console.error('Error deleting old image from Cloudinary:', error);
                    }
                }

                // Upload file baru ke Cloudinary
                const cloudinaryResult = await this.cloudinaryService.uploadFile(
                    data.imageFile,
                    'reports',
                );

                updateData.imageUrl = cloudinaryResult.url;
                updateData.imagePublicId = cloudinaryResult.public_id;

                console.log('📁 Report image updated in Cloudinary:', cloudinaryResult.url);
            }

            const updatedReport = await this.prisma.report.update({
                where: { id },
                data: updateData,
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                }
            });

            console.log(`📝 Laporan diperbarui: ${updatedReport.title} (ID: ${id})`);

            return updatedReport;
        } catch (error) {
            console.error('Error updating report:', error);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException('Gagal memperbarui laporan');
        }
    }

    // Delete report dengan cleanup Cloudinary
    async remove(id: number) {
        try {
            // Check if report exists
            const existingReport = await this.prisma.report.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    imagePublicId: true
                }
            });

            if (!existingReport) {
                throw new NotFoundException(`Laporan dengan ID ${id} tidak ditemukan`);
            }

            // Hapus gambar dari Cloudinary jika ada
            if (existingReport.imagePublicId) {
                try {
                    await this.cloudinaryService.deleteFile(existingReport.imagePublicId);
                    console.log('🗑️ Gambar laporan dihapus dari Cloudinary:', existingReport.imagePublicId);
                } catch (error) {
                    console.error('Error deleting image from Cloudinary:', error);
                    // Lanjutkan hapus data meskipun gagal hapus file
                }
            }

            await this.prisma.report.delete({
                where: { id },
            });

            console.log(`🗑️ Laporan dihapus: ${existingReport.title} (ID: ${id})`);

            return {
                message: `Laporan "${existingReport.title}" berhasil dihapus`,
                deletedReport: existingReport,
            };
        } catch (error) {
            console.error('Error deleting report:', error);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new BadRequestException('Gagal menghapus laporan');
        }
    }

    // Update report status
    async updateStatus(id: number, status: string) {
        try {
            // Check if report exists
            await this.findOne(id);

            const validStatuses = ['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'];
            if (!validStatuses.includes(status.toUpperCase())) {
                throw new BadRequestException(
                    `Status tidak valid. Gunakan: ${validStatuses.join(', ')}`
                );
            }

            const updatedReport = await this.prisma.report.update({
                where: { id },
                data: {
                    status: status.toUpperCase(),
                    updatedAt: new Date()
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                }
            });

            console.log(`🔄 Status laporan diubah: ${updatedReport.title} -> ${status}`);

            return {
                message: `Status laporan berhasil diubah menjadi ${status}`,
                report: updatedReport,
            };
        } catch (error) {
            console.error('Error updating report status:', error);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException('Gagal mengubah status laporan');
        }
    }

    // Get reports by category
    async findByCategory(category: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where: {
                    category: {
                        equals: category,
                        mode: 'insensitive'
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.report.count({
                where: {
                    category: {
                        equals: category,
                        mode: 'insensitive'
                    }
                }
            }),
        ]);

        return {
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                category,
            },
        };
    }

    // Get reports by status
    async findByStatus(status: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where: {
                    status: {
                        equals: status.toUpperCase(),
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.report.count({
                where: {
                    status: {
                        equals: status.toUpperCase(),
                    }
                }
            }),
        ]);

        return {
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                status,
            },
        };
    }

    // Search reports by keyword
    async searchByTitle(keyword: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where: {
                    OR: [
                        { title: { contains: keyword } },
                        { description: { contains: keyword } },
                        { category: { contains: keyword } },
                    ],
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.report.count({
                where: {
                    OR: [
                        { title: { contains: keyword } },
                        { description: { contains: keyword } },
                        { category: { contains: keyword } },
                    ],
                }
            }),
        ]);

        return {
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                keyword,
            },
        };
    }

    // Get report statistics
    async getReportStats() {
        const [
            totalReports,
            pendingReports,
            processingReports,
            resolvedReports,
            rejectedReports,
            totalByCategory
        ] = await Promise.all([
            this.prisma.report.count(),
            this.prisma.report.count({ where: { status: 'PENDING' } }),
            this.prisma.report.count({ where: { status: 'PROCESSING' } }),
            this.prisma.report.count({ where: { status: 'RESOLVED' } }),
            this.prisma.report.count({ where: { status: 'REJECTED' } }),
            this.prisma.report.groupBy({
                by: ['category'],
                _count: {
                    _all: true,
                },
            }),
        ]);

        return {
            total: totalReports,
            byStatus: {
                pending: pendingReports,
                processing: processingReports,
                resolved: resolvedReports,
                rejected: rejectedReports,
            },
            byCategory: totalByCategory.map(item => ({
                category: item.category,
                count: item._count._all,
            })),
        };
    }

    // Get reports by user ID
    async findByUserId(userId: number, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.report.count({ where: { userId } }),
        ]);

        return {
            data: reports,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                userId,
            },
        };
    }
}