import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Logger, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnnouncementsService } from './announcements.service';
import { Request } from 'express'; // at the top of your file
import { NotificationWebSocketGateway } from 'src/notification/websocket.gateway';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

// 🟢 Buat interface khusus agar TS tahu req.user punya id
interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        // tambahkan properti lain jika perlu, misal email, name, dll
    };
}

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
    private readonly logger = new Logger(AnnouncementsController.name)

    constructor(
        private readonly announcementsService: AnnouncementsService,
        private readonly wsGateway : NotificationWebSocketGateway
    ) { }

    // 🟢 Upload gambar pengumuman
    @Post('upload-image')
    @UseInterceptors(FileInterceptor('image'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File gambar tidak ditemukan');
        }
        this.logger.log(`Uploading announcement image: ${file.originalname}`);
        return this.announcementsService.uploadAnnouncementImage(file);
    }

    // 🟢 Buat pengumuman (hanya admin)
    @Post()
    async create(@Req() req: any, @Body() data: any) {
        this.logger.log(`Creating announcement by user ${req.user.id}`);
        this.logger.log(`Announcement data: ${JSON.stringify(data)}`);

        const result = await this.announcementsService.create(req.user.id, data);

        // Log connected users
        const connectedUsers = this.wsGateway.getConnectedUsers();
        this.logger.log(`Connected users after announcement: ${JSON.stringify(connectedUsers)}`);

        return result;
    }

    // 🔥 ENDPOINT TEST LANGSUNG
    @Post('test-real-time')
    async testRealTime(@Req() req: any, @Body() data: any) {
        this.logger.log('Testing real-time announcement notification');

        // Test langsung broadcast ke WebSocket
        const testData = {
            id: `test_${Date.now()}`,
            userId: req.user.id,
            type: 'ANNOUNCEMENT',
            title: '🚨 TEST REAL-TIME: ' + (data.title || 'Test Announcement'),
            message: data.description || 'This is a real-time test announcement',
            icon: 'announcement',
            iconColor: '#FF0000',
            data: {
                announcementId: 999,
                title: data.title || 'Test',
                description: data.description || 'Test description',
                action: 'view_announcement',
                timestamp: new Date().toISOString(),
            },
            isRead: false,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id,
        };

        // 1. Broadcast ke semua
        await this.wsGateway.broadcastAnnouncement(testData);

        // 2. Kirim ke user spesifik
        await this.wsGateway.sendNotificationToUser(req.user.id, {
            type: 'NEW_ANNOUNCEMENT',
            data: testData
        });

        return {
            success: true,
            message: 'Real-time test sent via WebSocket',
            data: testData,
            connectedUsers: this.wsGateway.getConnectedUsers()
        };
    }

    // 🟡 Lihat semua pengumuman
    @Get()
    async findAll() {
        return this.announcementsService.findAll();
    }

    // 🟡 Lihat satu pengumuman
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.announcementsService.findOne(Number(id));
    }

    // 🟠 Update (admin)
    @Put(':id')
    async update(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() data: any) {
        const adminId = req.user?.id || 1;
        return this.announcementsService.update(Number(id), adminId, data);
    }

    // 🔴 Hapus (admin)
    @Delete(':id')
    async delete(@Param('id') id: string, @Req() req : AuthenticatedRequest) {
        const adminId = req.user?.id || 1;
        return this.announcementsService.delete(Number(id), adminId);
    }
}
