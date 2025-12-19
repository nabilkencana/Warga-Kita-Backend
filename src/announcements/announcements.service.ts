import { Injectable, Logger, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { NotificationWebSocketGateway } from 'src/notification/websocket.gateway';

@Injectable()
export class AnnouncementsService {
    private readonly logger = new Logger(AnnouncementsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private wsGateway: NotificationWebSocketGateway,
    ) { }

    // 🟢 Admin membuat pengumuman dengan notifikasi real-time
    async create(adminId: number, data: any) {
        try {
            // 1. Buat pengumuman di database
            const announcement = await this.prisma.announcement.create({
                data: {
                    title: data.title,
                    description: data.description,
                    targetAudience: data.targetAudience,
                    date: new Date(data.date),
                    day: data.day,
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
            throw new Error('Gagal membuat pengumuman');
        }
    }

    private async sendAnnouncementNotification(announcement: any, adminName: string) {
        try {
            // Get users based on target audience
            let users: any[] = [];

            if (announcement.targetAudience === 'ALL_RESIDENTS') {
                users = await this.prisma.user.findMany({
                    where: {
                        isActive: true,
                        NOT: { id: announcement.createdBy } // Exclude admin sendiri
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

            // 🔥 KIRIM KE DATABASE
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
                    action: 'view_announcement',
                    timestamp: new Date().toISOString(),
                },
                createdBy: announcement.createdBy,
                relatedEntityId: announcement.id.toString(),
                relatedEntityType: 'announcement',
            });

            this.logger.log(`Database notifications created: ${dbResult.count}`);

            // 🔥 KIRIM WEBSOCKET KE SETIAP USER
            for (const userId of userIds) {
                try {
                    await this.wsGateway.sendNotificationToUser(userId, {
                        type: 'NEW_ANNOUNCEMENT',
                        data: {
                            id: `ann_${announcement.id}_${Date.now()}`, // ID unik untuk notif
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
                    this.logger.log(`WebSocket sent to user ${userId}`);
                } catch (wsError) {
                    this.logger.error(`Failed to send WebSocket to user ${userId}:`, wsError);
                    // Lanjutkan ke user berikutnya meski ada error
                }
            }

            this.logger.log(`Announcement notifications sent to ${userIds.length} users via WebSocket`);

        } catch (error) {
            this.logger.error('Failed to send announcement notifications:', error);
            // Jangan throw error di sini agar pengumuman tetap tersimpan
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
            orderBy: { createdAt: 'desc' },
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

        const updatedAnnouncement = await this.prisma.announcement.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                targetAudience: data.targetAudience,
                date: new Date(data.date),
                day: data.day,
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

        // 🔔 NOTIFIKASI: Kirim notifikasi update ke semua yang pernah menerima
        await this.sendUpdateNotification(updatedAnnouncement, adminId);

        this.logger.log(`Announcement updated: ${id} by admin ${adminId}`);
        return updatedAnnouncement;
    }

    // 🔔 Method untuk notifikasi update
    private async sendUpdateNotification(announcement: any, adminId: number) {
        try {
            // Dapatkan semua user yang pernah mendapat notifikasi pengumuman ini
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
                        description: `Pengumuman telah diperbarui oleh ${admin?.namaLengkap || 'Admin'}`,
                        action: 'view_announcement',
                        timestamp: new Date().toISOString(),
                        isUpdate: true,
                    },
                });

                this.logger.log(`Update notification sent to ${userIds.length} users`);
            }
        } catch (error) {
            this.logger.error('Failed to send update notification:', error);
        }
    }

    // 🔴 Admin bisa hapus dengan cleanup notifikasi
    async delete(id: number, adminId: number) {
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
            throw new ForbiddenException('Anda tidak punya izin untuk menghapus pengumuman ini');

        // 🔔 NOTIFIKASI: Kirim notifikasi penghapusan (opsional)
        await this.sendDeleteNotification(existing, adminId);

        // Hapus notifikasi terkait
        await this.prisma.notification.deleteMany({
            where: {
                relatedEntityId: id.toString(),
                relatedEntityType: 'announcement',
            },
        });

        // Hapus pengumuman
        await this.prisma.announcement.delete({ where: { id } });

        this.logger.log(`Announcement deleted: ${id} by admin ${adminId}`);
        return {
            message: 'Pengumuman berhasil dihapus',
            title: existing.title,
        };
    }

    // 🔔 Method untuk notifikasi penghapusan (opsional)
    private async sendDeleteNotification(announcement: any, adminId: number) {
        try {
            // Dapatkan semua user yang pernah mendapat notifikasi pengumuman ini
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

                this.logger.log(`Delete notification sent to ${userIds.length} users`);
            }
        } catch (error) {
            this.logger.error('Failed to send delete notification:', error);
        }
    }

    // 📊 Stats untuk dashboard admin
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