import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
    logger: any;
    notificationService: any;
    constructor(private prisma: PrismaService) { }

    // 🟢 Admin membuat pengumuman
    async create(adminId: number, data: any) {
        try {
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

            // 🔔 NOTIFIKASI: Buat notifikasi untuk target audience
            await this.notificationService.createAnnouncementNotification(
                announcement.id,
                adminId,
                announcement.title,
                announcement.description,
                announcement.targetAudience,
            );

            this.logger.log(`Announcement created: ${announcement.id} by admin ${adminId}`);
            return {
                message: 'Pengumuman berhasil dibuat',
                announcement
            };
        } catch (error) {
            this.logger.error('Error saat membuat pengumuman:', error);
            throw new Error('Gagal membuat pengumuman');
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

    // 🟠 Admin bisa update
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

        // 🔔 NOTIFIKASI: Pengumuman diupdate
        // Dapatkan semua user yang sebelumnya mendapat notifikasi ini
        const previousNotifications = await this.prisma.notification.findMany({
            where: {
                relatedEntityId: id.toString(),
                relatedEntityType: 'announcement',
            },
            select: { userId: true },
        });

        const userIds = previousNotifications.map(n => n.userId);

        if (userIds.length > 0) {
            await this.notificationService.createBulkNotifications(userIds, {
                type: NotificationType.ANNOUNCEMENT,
                title: 'Pengumuman Diperbarui',
                message: `Pengumuman "${updatedAnnouncement.title}" telah diperbarui`,
                icon: 'announcement',
                iconColor: '#3B82F6',
                createdBy: adminId,
                relatedEntityId: id.toString(),
                relatedEntityType: 'announcement',
                data: {
                    announcementId: id,
                    action: 'view_announcement',
                },
            });
        }

        this.logger.log(`Announcement updated: ${id} by admin ${adminId}`);
        return updatedAnnouncement;
    }

    // 🔴 Admin bisa hapus
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

        // 🔔 NOTIFIKASI: Hapus notifikasi terkait
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
}
