// src/emergency/emergency.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EmergencyGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    // Broadcast emergency alarm to all security
    broadcastEmergency(emergency: any) {
        this.server.emit('emergency:new', emergency);
        this.server.to('security-room').emit('emergency:alert', {
            type: 'SOS',
            emergency,
            timestamp: new Date()
        });
    }

    // Security joins security room
    @SubscribeMessage('security:join')
    handleSecurityJoin(client: Socket, data: { securityId: number }) {
        client.join('security-room');
        client.join(`security:${data.securityId}`);
        this.server.to('security-room').emit('security:online', {
            securityId: data.securityId,
            timestamp: new Date()
        });
    }

    // Update security location in real-time
    @SubscribeMessage('security:location')
    handleLocationUpdate(client: Socket, data: {
        securityId: number;
        latitude: string;
        longitude: string;
    }) {
        this.server.to('security-room').emit('security:location:update', {
            securityId: data.securityId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date()
        });
    }
}