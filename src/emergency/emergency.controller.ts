// src/emergency/emergency.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    ParseIntPipe,
    BadRequestException,
} from '@nestjs/common';
import { EmergencyService } from './emergency.service';

@Controller('emergency')
export class EmergencyController {
    constructor(private readonly emergencyService: EmergencyService) { }

    // === EXISTING ENDPOINTS ===

    // POST - Create new SOS emergency
    @Post('sos')
    async createSOS(@Body() body: any) {
        try {
            // Validasi required field
            if (!body.type) {
                throw new BadRequestException('Jenis darurat harus diisi');
            }

            const emergencyData = {
                type: body.type,
                details: body.details,
                location: body.location,
                latitude: body.latitude,
                longitude: body.longitude,
                needVolunteer: body.needVolunteer || false,
                volunteerCount: body.volunteerCount || 0,
                userId: body.userId ? Number(body.userId) : undefined,
                severity: body.severity || 'MEDIUM',
            };

            return this.emergencyService.createSOS(emergencyData);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new BadRequestException(message || 'Gagal membuat emergency');
        }
    }

    // GET - Get all active emergencies
    @Get('active')
    async getActiveEmergencies() {
        return this.emergencyService.getActiveEmergencies();
    }

    // GET - Get emergencies that need volunteers
    @Get('need-volunteers')
    async getEmergenciesNeedVolunteers() {
        return this.emergencyService.getEmergenciesNeedVolunteers();
    }

    // GET - Get all emergencies
    @Get()
    async getAllEmergencies() {
        return this.emergencyService.getAllEmergencies();
    }

    // GET - Get emergency by ID
    @Get(':id')
    async getEmergencyById(@Param('id', ParseIntPipe) id: number) {
        return this.emergencyService.getEmergencyById(id);
    }

    // PATCH - Update emergency status
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        if (!body.status) {
            throw new BadRequestException('Status harus diisi');
        }

        return this.emergencyService.updateStatus(id, body.status);
    }

    // PATCH - Toggle need volunteer
    @Patch(':id/toggle-volunteer')
    async toggleNeedVolunteer(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        if (body.needVolunteer === undefined) {
            throw new BadRequestException('needVolunteer harus diisi');
        }

        return this.emergencyService.toggleNeedVolunteer(
            id,
            body.needVolunteer,
            body.volunteerCount
        );
    }

    // POST - Register as volunteer
    @Post(':id/volunteer')
    async registerVolunteer(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        if (!body.userName && !body.userId) {
            throw new BadRequestException('Nama relawan atau user ID harus diisi');
        }

        const volunteerData = {
            userId: body.userId ? Number(body.userId) : undefined,
            userName: body.userName,
            userPhone: body.userPhone,
            skills: body.skills,
        };

        return this.emergencyService.registerVolunteer(id, volunteerData);
    }

    // PATCH - Update volunteer status
    @Patch('volunteer/:volunteerId/status')
    async updateVolunteerStatus(
        @Param('volunteerId', ParseIntPipe) volunteerId: number,
        @Body() body: any,
    ) {
        if (!body.status) {
            throw new BadRequestException('Status relawan harus diisi');
        }

        return this.emergencyService.updateVolunteerStatus(volunteerId, body.status);
    }

    // GET - Get volunteers for an emergency
    @Get(':id/volunteers')
    async getEmergencyVolunteers(@Param('id', ParseIntPipe) id: number) {
        return this.emergencyService.getEmergencyVolunteers(id);
    }

    // PATCH - Cancel emergency
    @Patch(':id/cancel')
    async cancelEmergency(@Param('id', ParseIntPipe) id: number) {
        return this.emergencyService.cancelEmergency(id);
    }

    // PATCH - Resolve emergency
    @Patch(':id/resolve')
    async resolveEmergency(@Param('id', ParseIntPipe) id: number) {
        return this.emergencyService.resolveEmergency(id);
    }

    // GET - Get emergencies by type
    @Get('type/:type')
    async getEmergenciesByType(@Param('type') type: string) {
        return this.emergencyService.getEmergenciesByType(type);
    }

    // GET - Get emergency statistics
    @Get('stats/overview')
    async getEmergencyStats() {
        return this.emergencyService.getEmergencyStats();
    }

    // === NEW SECURITY ENDPOINTS ===

    // GET - Get emergencies for security dashboard
    @Get('security/dashboard')
    async getSecurityEmergencies() {
        return this.emergencyService.getSecurityEmergencies();
    }

    // POST - Security accept emergency
    @Post('security/accept')
    async securityAcceptEmergency(@Body() body: { securityId: number; emergencyId: number }) {
        if (!body.securityId || !body.emergencyId) {
            throw new BadRequestException('securityId dan emergencyId harus diisi');
        }

        return this.emergencyService.acceptEmergency(body.securityId, body.emergencyId);
    }

    // POST - Security arrive at emergency
    @Post('security/arrive')
    async securityArriveAtEmergency(@Body() body: { securityId: number; emergencyId: number }) {
        if (!body.securityId || !body.emergencyId) {
            throw new BadRequestException('securityId dan emergencyId harus diisi');
        }

        return this.emergencyService.arriveAtEmergency(body.securityId, body.emergencyId);
    }

    // POST - Security complete emergency
    @Post('security/complete')
    async securityCompleteEmergency(@Body() body: {
        securityId: number;
        emergencyId: number;
        actionTaken: string;
        notes?: string;
    }) {
        if (!body.securityId || !body.emergencyId || !body.actionTaken) {
            throw new BadRequestException('securityId, emergencyId, dan actionTaken harus diisi');
        }

        return this.emergencyService.completeEmergency(
            body.securityId,
            body.emergencyId,
            body.actionTaken,
            body.notes
        );
    }

    // GET - Get security statistics
    @Get('security/stats')
    async getSecurityStats(@Body() body?: { securityId?: number }) {
        return this.emergencyService.getSecurityStats(body?.securityId);
    }

    // GET - Get emergency responses untuk security tertentu
    @Get('security/:securityId/responses')
    async getSecurityResponses(@Param('securityId', ParseIntPipe) securityId: number) {
        return this.emergencyService.getSecurityStats(securityId);
    }
}