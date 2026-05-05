import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { NotificationWebSocketGateway } from 'src/notification/websocket.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AnnouncementsService {
    private readonly logger = new Logger(AnnouncementsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private wsGateway: NotificationWebSocketGateway,
        private cloudinaryService: CloudinaryService,
    ) { }

    // 🟢 Admin membuat pengumuman dengan notifikasi real-time
    async create(adminId: number, data: any) {
        try {
            // Jika isHighlight=true, reset highlight lainnya dulu
            if (data.isHighlight) {
                await this.prisma.announcement.updateMany({
                    where: { isHighlight: true },
                    data: { isHighlight: false },
                });
            }

            // 1. Buat pengumuman di database
            const announcement = await this.prisma.announcement.create({
                data: {
                    title: data.title,
                    description: data.description,
                    targetAudience: data.targetAudience,
                    date: new Date(data.date),
                    day: data.day,
                    imageUrl: data.imageUrl || null,
                    imagePublicId: data.imagePublicId || null,
                    isHighlight: data.isHighlight === true,
                    createdBy: adminId,
                },
                include: {
                    admin: {
                        select: {
                            id: true,
                            namaLengkap: true,
                            email: true
                        }
                    },
                },
            });

            this.logger.log(`Announcement created: ${announcement.id} by admin ${adminId}`);

            // 2. Dapatkan admin info
            const admin = await this.prisma.user.findUnique({
                where: { id: adminId },
                select: { namaLengkap: true }
            });

            // 3. Kirim notifikasi ke database DAN WebSocket
            await this.sendAnnouncementNotification(announcement, admin?.namaLengkap || 'Admin');

            return {
                message: 'Pengumuman berhasil dibuat',
                announcement
            };
        } catch (error) {
            this.logger.error('Error saat membuat pengumuman:', error);
            throw new Error('Gagal membuat pengumuman: ' + error.message);
        }
    }

    // 🟢 Upload gambar ke Cloudinary
    async uploadAnnouncementImage(file: Express.Multer.File): Promise<{ imageUrl: string; imagePublicId: string }> {
        try {
            const result = await this.cloudinaryService.uploadFile(file, 'announcements');
            return {
                imageUrl: result.secure_url,
                imagePublicId: result.public_id,
            };
        } catch (error) {
            this.logger.error('Error uploading announcement image:', error);
            throw new Error('Gagal mengupload gambar: ' + error.message);
        }
    }

    private async sendAnnouncementNotification(announcement: any, adminName: string) {
        try {
            let users: any[] = [];

            if (announcement.targetAudience === 'ALL_RESIDENTS') {
                users = await this.prisma.user.findMany({
                    where: {
                        isActive: true,
                        NOT: { id: announcement.createdBy }
                    },
                    select: { id: true, namaLengkap: true },
                });
            } else if (announcement.targetAudience.startsWith('RT_')) {
                const rt = announcement.targetAudience.split('_')[1];
                users = await this.prisma.user.findMany({
                    where: {
                        isActive: true,
                        rtRw: { contains: rt },
                        NOT: { id: announcement.createdBy }
                    },
                    select: { id: true, namaLengkap: true },
                });
            } else {
                users = await this.prisma.user.findMany({
                    where: {
                        isActive: true,
                        NOT: { id: announcement.createdBy }
                    },
                    select: { id: true, namaLengkap: true },
                });
            }

            this.logger.log(`Sending announcement to ${users.length} users`);

            if (users.length === 0) {
                this.logger.warn('No users found for announcement notification');
                return;
            }

            const userIds = users.map(user => user.id);

            const dbResult = await this.notificationService.createBulkNotifications(userIds, {
                type: 'ANNOUNCEMENT',
                title: '📢 Pengumuman Baru',
                message: `${announcement.title} - dari ${adminName}`,
                icon: 'announcement',
                iconColor: '#3B82F6',
                data: {
                    announcementId: announcement.id,
                    title: announcement.title,
                    description: announcement.description.substring(0, 100) + '...',
                    targetAudience: announcement.targetAudience,
                    createdBy: adminName,
                    imageUrl: announcement.imageUrl || null,
                    isHighlight: announcement.isHighlight,
                    action: 'view_announcement',
                    timestamp: new Date().toISOString(),
                },
                createdBy: announcement.createdBy,
                relatedEntityId: announcement.id.toString(),
                relatedEntityType: 'announcement',
            });

            this.logger.log(`Database notifications created: ${dbResult.count}`);

            for (const userId of userIds) {
                try {
                    await this.wsGateway.sendNotificationToUser(userId, {
                        type: 'NEW_ANNOUNCEMENT',
                        data: {
                            id: `ann_${announcement.id}_${Date.now()}`,
                            userId: userId,
                            type: 'ANNOUNCEMENT',
                            title: '📢 Pengumuman Baru',
                            message: `${announcement.title} - dari ${adminName}`,
                            icon: 'announcement',
                            iconColor: '#3B82F6',
                            data: {
                                announcementId: announcement.id,
                                title: announcement.title,
                                description: announcement.description.substring(0, 100) + '...',
                                targetAudience: announcement.targetAudience,
                                imageUrl: announcement.imageUrl || null,
                                isHighlight: announcement.isHighlight,
                                createdBy: adminName,
                                action: 'view_announcement',
                                timestamp: new Date().toISOString(),
                            },
                            isRead: false,
                            isArchived: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            createdBy: announcement.createdBy,
                        }
                    });
                } catch (wsError) {
                    this.logger.error(`Failed to send WebSocket to user ${userId}:`, wsError);
                }
            }

            this.logger.log(`Announcement notifications sent to ${userIds.length} users via WebSocket`);

        } catch (error) {
            this.logger.error('Failed to send announcement notifications:', error);
        }
    }

    // 🟡 Semua user bisa lihat daftar pengumuman
    async findAll() {
        return this.prisma.announcement.findMany({
            include: {
                admin: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        email: true
                    }
                },
            },
            orderBy: [
                { isHighlight: 'desc' }, // Highlight tampil pertama
                { createdAt: 'desc' },
            ],
        });
    }

    // 🟡 Lihat detail pengumuman berdasarkan ID
    async findOne(id: number) {
        const announcement = await this.prisma.announcement.findUnique({
            where: { id },
            include: {
                admin: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        email: true
                    }
                },
            },
        });

        if (!announcement) throw new NotFoundException('Pengumuman tidak ditemukan');
        return announcement;
    }

    // 🟡 Ambil pengumuman yang di-highlight
    async getHighlighted() {
        return this.prisma.announcement.findFirst({
            where: { isHighlight: true },
            include: {
                admin: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        email: true
                    }
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    // 🟠 Admin bisa update dengan notifikasi
    async update(id: number, adminId: number, data: any) {
        const existing = await this.prisma.announcement.findUnique({
            where: { id },
            include: {
                admin: {
                    select: {
                        id: true,
                        namaLengkap: true,
                    }
                }
            }
        });

        if (!existing) throw new NotFoundException('Pengumuman tidak ditemukan');

        if (existing.createdBy !== adminId)
            throw new ForbiddenException('Anda tidak punya izin untuk mengubah pengumuman ini');

        // Jika set highlight baru, reset yang lain dulu
        if (data.isHighlight === true && !existing.isHighlight) {
            await this.prisma.announcement.updateMany({
                where: { isHighlight: true, id: { not: id } },
                data: { isHighlight: false },
            });
        }

        // Hapus gambar lama dari Cloudinary jika diganti
        if (data.imagePublicId && existing.imagePublicId && data.imagePublicId !== existing.imagePublicId) {
            try {
                await this.cloudinaryService.deleteFile(existing.imagePublicId);
            } catch (e) {
                this.logger.warn('Gagal hapus gambar lama:', e.message);
            }
        }

        const updatedAnnouncement = await this.prisma.announcement.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                targetAudience: data.targetAudience,
                date: new Date(data.date),
                day: data.day,
                imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
                imagePublicId: data.imagePublicId !== undefined ? data.imagePublicId : existing.imagePublicId,
                isHighlight: data.isHighlight !== undefined ? data.isHighlight === true : existing.isHighlight,
                updatedAt: new Date(),
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        namaLengkap: true,
                    }
                }
            },
        });

        await this.sendUpdateNotification(updatedAnnouncement, adminId);

        this.logger.log(`Announcement updated: ${id} by admin ${adminId}`);
        return updatedAnnouncement;
    }

    private async sendUpdateNotification(announcement: any, adminId: number) {
        try {
            const previousNotifications = await this.prisma.notification.findMany({
                where: {
                    relatedEntityId: announcement.id.toString(),
                    relatedEntityType: 'announcement',
                },
                select: { userId: true },
            });

            const userIds = [...new Set(previousNotifications.map(n => n.userId))];

            if (userIds.length > 0) {
                const admin = await this.prisma.user.findUnique({
                    where: { id: adminId },
                    select: { namaLengkap: true }
                });

                await this.notificationService.createBulkNotifications(userIds, {
                    type: NotificationType.ANNOUNCEMENT,
                    title: '🔄 Pengumuman Diperbarui',
                    message: `"${announcement.title}" telah diperbarui`,
                    icon: 'announcement',
                    iconColor: '#8B5CF6',
                    createdBy: adminId,
                    relatedEntityId: announcement.id.toString(),
                    relatedEntityType: 'announcement',
                    data: {
                        announcementId: announcement.id,
                        title: announcement.title,
                        imageUrl: announcement.imageUrl || null,
                        description: `Pengumuman telah diperbarui oleh ${admin?.namaLengkap || 'Admin'}`,
                        action: 'view_announcement',
                        timestamp: new Date().toISOString(),
                        isUpdate: true,
                    },
                });
            }
        } catch (error) {
            this.logger.error('Failed to send update notification:', error);
        }
    }

    // 🔴 Admin bisa hapus dengan cleanup notifikasi
    async delete(id: number, adminId: number) {
        const existing = await this.prisma.announcement.findUnique({
            where: { id },
        });

        if (!existing) throw new NotFoundException('Pengumuman tidak ditemukan');

        if (existing.createdBy !== adminId)
            throw new ForbiddenException('Anda tidak punya izin untuk menghapus pengumuman ini');

        // Hapus gambar dari Cloudinary jika ada
        if (existing.imagePublicId) {
            try {
                await this.cloudinaryService.deleteFile(existing.imagePublicId);
                this.logger.log(`Deleted image from Cloudinary: ${existing.imagePublicId}`);
            } catch (e) {
                this.logger.warn('Gagal hapus gambar dari Cloudinary:', e.message);
            }
        }

        await this.sendDeleteNotification(existing, adminId);

        await this.prisma.notification.deleteMany({
            where: {
                relatedEntityId: id.toString(),
                relatedEntityType: 'announcement',
            },
        });

        await this.prisma.announcement.delete({ where: { id } });

        this.logger.log(`Announcement deleted: ${id} by admin ${adminId}`);
        return {
            message: 'Pengumuman berhasil dihapus',
            title: existing.title,
        };
    }

    private async sendDeleteNotification(announcement: any, adminId: number) {
        try {
            const previousNotifications = await this.prisma.notification.findMany({
                where: {
                    relatedEntityId: announcement.id.toString(),
                    relatedEntityType: 'announcement',
                },
                select: { userId: true },
            });

            const userIds = [...new Set(previousNotifications.map(n => n.userId))];

            if (userIds.length > 0) {
                await this.notificationService.createBulkNotifications(userIds, {
                    type: NotificationType.ANNOUNCEMENT,
                    title: '🗑️ Pengumuman Dihapus',
                    message: `"${announcement.title}" telah dihapus`,
                    icon: 'delete',
                    iconColor: '#EF4444',
                    createdBy: adminId,
                    relatedEntityType: 'announcement',
                    data: {
                        title: announcement.title,
                        action: 'announcement_deleted',
                        timestamp: new Date().toISOString(),
                        isDeleted: true,
                    },
                });
            }
        } catch (error) {
            this.logger.error('Failed to send delete notification:', error);
        }
    }

    async getStats() {
        const [total, today, byAudience] = await Promise.all([
            this.prisma.announcement.count(),
            this.prisma.announcement.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.announcement.groupBy({
                by: ['targetAudience'],
                _count: true,
            }),
        ]);

        return {
            total,
            today,
            byAudience: byAudience.reduce((acc, item) => {
                acc[item.targetAudience] = item._count;
                return acc;
            }, {}),
        };
    }
}