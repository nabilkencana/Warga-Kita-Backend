// src/notification/websocket.gateway.ts
import {
    WebSocketGateway as NestWebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

@NestWebSocketGateway({
    cors: {
        origin: 'https://wargakita.canadev.my.id', // Ganti dengan domain Flutter di production
        credentials: true,
    },
    transports: ['websocket', 'polling'], // ✅ Tambahkan transport options
    namespace: '/notifications', // Tentukan namespace
})
export class NotificationWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(NotificationWebSocketGateway.name);
    private userSocketMap = new Map<number, string[]>();

    constructor() {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            const userId = client.handshake.query.userId;
            if (userId && !isNaN(Number(userId))) {
                const userIdNum = Number(userId);

                // Simpan multiple socket connections per user
                if (!this.userSocketMap.has(userIdNum)) {
                    this.userSocketMap.set(userIdNum, []);
                }

                const userSockets = this.userSocketMap.get(userIdNum);
                userSockets!.push(client.id);

                // Join room berdasarkan userId
                await client.join(`user_${userIdNum}`);

                // Juga join ke room umum berdasarkan RT jika ada
                const rt = client.handshake.query.rt;
                if (rt) {
                    await client.join(`rt_${rt}`);
                }

                // Join ke room general
                await client.join('general');

                this.logger.log(`Client connected: ${client.id} for user ${userIdNum}`);
                this.logger.log(`Total connections for user ${userIdNum}: ${userSockets!.length}`);

                // Kirim welcome message
                client.emit('connected', {
                    type: 'CONNECTED',
                    data: {
                        message: 'WebSocket connected successfully',
                        userId: userIdNum,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            this.logger.error('Error in handleConnection:', error);
        }
    }

    handleDisconnect(client: Socket) {
        try {
            for (const [userId, socketIds] of this.userSocketMap.entries()) {
                const index = socketIds.indexOf(client.id);
                if (index !== -1) {
                    socketIds.splice(index, 1);
                    this.logger.log(`Client disconnected: ${client.id} for user ${userId}`);

                    // Jika tidak ada koneksi lagi, hapus dari map
                    if (socketIds.length === 0) {
                        this.userSocketMap.delete(userId);
                    }
                    break;
                }
            }
        } catch (error) {
            this.logger.error('Error in handleDisconnect:', error);
        }
    }

    // Method untuk mengirim notifikasi ke user tertentu
    async sendNotificationToUser(userId: number, notificationData: any) {
        try {
            this.server.to(`user_${userId}`).emit('new_notification', notificationData);
            this.logger.log(`Notification sent to user ${userId} via room`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send notification to user ${userId}:`, error);
            return false;
        }
    }

    // Method untuk broadcast ke semua user
    async broadcastNotification(notificationData: any) {
        try {
            this.server.to('general').emit('new_notification', notificationData);
            this.logger.log(`Broadcast notification sent to all users`);
            return true;
        } catch (error) {
            this.logger.error('Failed to broadcast notification:', error);
            return false;
        }
    }


    // Method untuk broadcast ke RT tertentu
    async broadcastToRT(rtNumber: string, notificationData: any): Promise<number> {
        try {
            const payload = {
                type: notificationData.type || 'RT_BROADCAST',
                data: {
                    ...notificationData.data,
                    rt: rtNumber,
                    serverTime: new Date(),
                    id: `rt_${rtNumber}_${Date.now()}`
                }
            };

            this.server.to(`rt_${rtNumber}`).emit('notification', payload);
            this.logger.log(`📍 RT ${rtNumber} broadcast sent`);
            return 1;

        } catch (error) {
            this.logger.error(`RT broadcast failed: ${error.message}`);
            return 0;
        }
    }

    // Method khusus untuk announcement broadcast
    async broadcastAnnouncement(announcementData: any, targetRT?: string) {
        try {
            const notificationData = {
                type: 'NEW_ANNOUNCEMENT',
                data: announcementData
            };

            if (targetRT) {
                // Broadcast ke RT tertentu
                this.server.to(`rt_${targetRT}`).emit('new_notification', notificationData);
                this.logger.log(`Announcement broadcast to RT ${targetRT}`);
            } else {
                // Broadcast ke semua
                this.server.to('general').emit('new_notification', notificationData);
                this.logger.log(`Announcement broadcast to all users`);
            }

            return true;
        } catch (error) {
            this.logger.error('Failed to broadcast announcement:', error);
            return false;
        }
    }

    // Debug: Get connected users
    getConnectedUsers() {
        const result = {};
        for (const [userId, socketIds] of this.userSocketMap.entries()) {
            result[userId] = socketIds.length;
        }
        return result;
    }

    // Helper method untuk mendapatkan info connections
    getConnectionStats() {
        return {
            totalConnections: this.userSocketMap.size,
            connectedUsers: Array.from(this.userSocketMap.keys()),
            timestamp: new Date()
        };
    }

    // Validasi token (basic implementation)
    private validateToken(token: string): boolean {
        // Untuk development, kita bypass validation dulu
        // Di production, validasi JWT token di sini
        return true;
    }
}