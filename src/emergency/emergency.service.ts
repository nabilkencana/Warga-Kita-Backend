// src/emergency/emergency.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Import atau define enums
type EmergencySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type NotificationType = 'SYSTEM' | 'ANNOUNCEMENT' | 'REPORT' | 'EMERGENCY' | 'BILL' | 'PAYMENT' | 'SECURITY' | 'PROFILE' | 'COMMUNITY' | 'REMINDER' | 'CUSTOM' | 'SOS_ALERT' | 'PATROL';
type SecurityAction = 'CHECK_IN' | 'CHECK_OUT' | 'PATROL_START' | 'PATROL_END' | 'EMERGENCY_RESPONSE' | 'LOCATION_UPDATE' | 'STATUS_CHANGE' | 'INCIDENT_REPORT';

@Injectable()
export class EmergencyService {
    constructor(private prisma: PrismaService) { }

    // Create new emergency SOS dengan fitur security
    async createSOS(data: {
        type: string;
        details?: string;
        location?: string;
        latitude?: string;
        longitude?: string;
        needVolunteer?: boolean;
        volunteerCount?: number;
        userId?: number;
        severity?: EmergencySeverity;
    }) {
        const emergency = await this.prisma.emergency.create({
            data: {
                type: data.type,
                details: data.details,
                location: data.location,
                latitude: data.latitude,
                longitude: data.longitude,
                needVolunteer: data.needVolunteer || false,
                volunteerCount: data.volunteerCount || 0,
                severity: (data.severity as any) || 'MEDIUM',
                status: 'ACTIVE',
                userId: data.userId,
                alarmSent: false,
            },
            include: {
                volunteers: true,
                user: {
                    select: {
                        namaLengkap: true,
                        nomorTelepon: true,
                    }
                }
            },
        });

        // Kirim alarm ke security
        await this.sendSecurityAlarm(emergency);

        // Kirim notifikasi ke emergency services jika diperlukan
        if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
            await this.notifyEmergencyServices(emergency);
        }

        return emergency;
    }

    // Kirim alarm ke semua security yang sedang bertugas
    private async sendSecurityAlarm(emergency: any) {
        try {
            // 1. Dapatkan semua security yang sedang bertugas
            const activeSecurities = await this.prisma.security.findMany({
                where: {
                    isOnDuty: true,
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    nama: true,
                    deviceToken: true,
                }
            });

            if (activeSecurities.length === 0) return;

            // 2. Buat notifikasi untuk setiap security
            const notifications = activeSecurities.map(security => ({
                title: `🚨 EMERGENCY ALARM - ${emergency.type.toUpperCase()}`,
                message: `Emergency terjadi di ${emergency.location || 'lokasi tidak diketahui'}. Severity: ${emergency.severity}`,
                type: 'SOS_ALERT' as NotificationType,
                icon: 'alert-triangle',
                iconColor: '#FF0000',
                data: {
                    emergencyId: emergency.id,
                    type: emergency.type,
                    location: emergency.location,
                    latitude: emergency.latitude,
                    longitude: emergency.longitude,
                    severity: emergency.severity,
                    timestamp: new Date().toISOString(),
                    actionRequired: true
                },
                isRead: false,
                userId: security.id,
                relatedEntityId: emergency.id.toString(),
                relatedEntityType: 'EMERGENCY',
                createdBy: emergency.userId || 0,
            }));

            // 3. Simpan notifikasi ke database
            await this.prisma.notification.createMany({
                data: notifications as any
            });

            // 4. Dispatch security terdekat
            if (emergency.latitude && emergency.longitude) {
                await this.dispatchNearestSecurity(emergency);
            }

            // 5. Update flag alarm sent
            await this.prisma.emergency.update({
                where: { id: emergency.id },
                data: {
                    alarmSent: true,
                    alarmSentAt: new Date()
                }
            });

            // 6. Log aktivitas security
            await this.logSecurityAction({
                action: 'EMERGENCY_RESPONSE',
                details: `Emergency ${emergency.id} - ${emergency.type} reported`,
                latitude: emergency.latitude,
                longitude: emergency.longitude
            });

        } catch (error) {
            console.error('Error sending security alarm:', error);
        }
    }

    // Dispatch security terdekat
    private async dispatchNearestSecurity(emergency: any) {
        try {
            // Dapatkan security yang sedang bertugas dan memiliki lokasi
            const availableSecurities = await this.prisma.security.findMany({
                where: {
                    isOnDuty: true,
                    status: 'ACTIVE',
                    currentLatitude: { not: null },
                    currentLongitude: { not: null }
                },
                select: {
                    id: true,
                    nama: true,
                    currentLatitude: true,
                    currentLongitude: true
                }
            });

            if (availableSecurities.length === 0) return;

            // Hitung jarak ke setiap security
            const securityDistances = availableSecurities.map(security => {
                let distance = 99999;
                try {
                    if (emergency.latitude && emergency.longitude && security.currentLatitude && security.currentLongitude) {
                        distance = this.calculateDistance(
                            parseFloat(emergency.latitude),
                            parseFloat(emergency.longitude),
                            parseFloat(security.currentLatitude),
                            parseFloat(security.currentLongitude)
                        );
                    }
                } catch (e) {
                    console.error('Error calculating distance:', e);
                }
                return { ...security, distance };
            });

            // Urutkan berdasarkan jarak terdekat
            securityDistances.sort((a, b) => a.distance - b.distance);

            // Ambil 3 security terdekat
            const nearestSecurities = securityDistances.slice(0, 3);

            // Buat emergency response untuk security terdekat
            for (const security of nearestSecurities) {
                await this.prisma.emergencyResponse.create({
                    data: {
                        emergencyId: emergency.id,
                        securityId: security.id,
                        responseTime: 0,
                        status: 'DISPATCHED'
                    }
                });

                // Kirim notifikasi khusus ke security terdekat
                await this.prisma.notification.create({
                    data: {
                        title: `🚨 DISPATCH ORDER - Emergency #${emergency.id}`,
                        message: `Anda ditugaskan untuk merespons emergency di ${emergency.location}.`,
                        type: 'SOS_ALERT' as any,
                        icon: 'navigation',
                        iconColor: '#FFA500',
                        data: {
                            emergencyId: emergency.id,
                            type: emergency.type,
                            location: emergency.location,
                            latitude: emergency.latitude,
                            longitude: emergency.longitude,
                            severity: emergency.severity,
                            dispatchOrder: true,
                        },
                        isRead: false,
                        userId: security.id,
                        relatedEntityId: emergency.id.toString(),
                        relatedEntityType: 'EMERGENCY',
                        createdBy: emergency.userId || 0,
                    }
                });
            }

        } catch (error) {
            console.error('Error dispatching security:', error);
        }
    }

    // Notify emergency services
    private async notifyEmergencyServices(emergency: any) {
        try {
            console.log(`Notifying emergency services for emergency #${emergency.id}`);

            await this.logSecurityAction({
                action: 'INCIDENT_REPORT' as SecurityAction,
                details: `Emergency #${emergency.id} reported to emergency services`,
                latitude: emergency.latitude,
                longitude: emergency.longitude
            });

        } catch (error) {
            console.error('Error notifying emergency services:', error);
        }
    }

    // Log security action
    private async logSecurityAction(data: {
        action: SecurityAction;
        details?: string;
        location?: string;
        latitude?: string;
        longitude?: string;
    }) {
        try {
            const activeSecurities = await this.prisma.security.findMany({
                where: { isOnDuty: true },
                select: { id: true }
            });

            const logs = activeSecurities.map(security => ({
                securityId: security.id,
                action: data.action,
                details: data.details,
                location: data.location,
                latitude: data.latitude,
                longitude: data.longitude,
                timestamp: new Date()
            }));

            await this.prisma.securityLog.createMany({
                data: logs as any
            });
        } catch (error) {
            console.error('Error logging security action:', error);
        }
    }

    // Calculate distance utility
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius bumi dalam km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(value: number): number {
        return value * Math.PI / 180;
    }

    // === METHODS UNTUK CONTROLLER ===

    // Get all active emergencies
    async getActiveEmergencies() {
        return this.prisma.emergency.findMany({
            where: {
                status: 'ACTIVE',
            },
            include: {
                volunteers: {
                    where: {
                        status: 'APPROVED',
                    },
                },
                emergencyResponses: {
                    include: {
                        security: {
                            select: {
                                nama: true,
                                nomorTelepon: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get all emergencies
    async getAllEmergencies() {
        return this.prisma.emergency.findMany({
            include: {
                volunteers: true,
                emergencyResponses: {
                    include: {
                        security: {
                            select: {
                                nama: true,
                                nomorTelepon: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        namaLengkap: true,
                        nomorTelepon: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get emergencies that need volunteers
    async getEmergenciesNeedVolunteers() {
        return this.prisma.emergency.findMany({
            where: {
                status: 'ACTIVE',
                needVolunteer: true,
            },
            include: {
                volunteers: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get emergency by ID
    async getEmergencyById(id: number) {
        const emergency = await this.prisma.emergency.findUnique({
            where: { id },
            include: {
                volunteers: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                emergencyResponses: {
                    include: {
                        security: {
                            select: {
                                id: true,
                                nama: true,
                                nomorTelepon: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        namaLengkap: true,
                        nomorTelepon: true,
                        email: true
                    }
                }
            },
        });

        if (!emergency) {
            throw new NotFoundException(`Emergency dengan ID ${id} tidak ditemukan`);
        }

        return emergency;
    }

    // Update emergency status
    async updateStatus(id: number, status: string) {
        await this.getEmergencyById(id);

        return this.prisma.emergency.update({
            where: { id },
            data: { status },
        });
    }

    // Toggle need volunteer
    async toggleNeedVolunteer(id: number, needVolunteer: boolean, volunteerCount?: number) {
        await this.getEmergencyById(id);

        const updateData: any = {
            needVolunteer: needVolunteer,
        };

        if (volunteerCount !== undefined) {
            updateData.volunteerCount = volunteerCount;
        }

        return this.prisma.emergency.update({
            where: { id },
            data: updateData,
        });
    }

    // Register as volunteer
    async registerVolunteer(emergencyId: number, data: {
        userId?: number;
        userName?: string;
        userPhone?: string;
        skills?: string;
    }) {
        // Check if emergency exists
        await this.getEmergencyById(emergencyId);

        return this.prisma.volunteer.create({
            data: {
                emergencyId: emergencyId,
                userId: data.userId,
                userName: data.userName,
                userPhone: data.userPhone,
                skills: data.skills,
                status: 'REGISTERED',
            },
        });
    }

    // Update volunteer status
    async updateVolunteerStatus(volunteerId: number, status: string) {
        const volunteer = await this.prisma.volunteer.findUnique({
            where: { id: volunteerId },
        });

        if (!volunteer) {
            throw new NotFoundException(`Relawan dengan ID ${volunteerId} tidak ditemukan`);
        }

        return this.prisma.volunteer.update({
            where: { id: volunteerId },
            data: { status },
        });
    }

    // Get volunteers for an emergency
    async getEmergencyVolunteers(emergencyId: number) {
        return this.prisma.volunteer.findMany({
            where: {
                emergencyId: emergencyId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Cancel emergency
    async cancelEmergency(id: number) {
        return this.updateStatus(id, 'CANCELLED');
    }

    // Resolve emergency
    async resolveEmergency(id: number) {
        const emergency = await this.getEmergencyById(id);

        // Update semua emergency response yang masih aktif
        await this.prisma.emergencyResponse.updateMany({
            where: {
                emergencyId: id,
                status: { in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDLING'] }
            },
            data: {
                status: 'RESOLVED',
                completedAt: new Date()
            }
        });

        return this.updateStatus(id, 'RESOLVED');
    }

    // Get emergencies by type
    async getEmergenciesByType(type: string) {
        return this.prisma.emergency.findMany({
            where: {
                type: type,
                status: 'ACTIVE',
            },
            include: {
                volunteers: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get emergency statistics
    async getEmergencyStats() {
        const total = await this.prisma.emergency.count();
        const active = await this.prisma.emergency.count({
            where: { status: 'ACTIVE' },
        });
        const resolved = await this.prisma.emergency.count({
            where: { status: 'RESOLVED' },
        });
        const cancelled = await this.prisma.emergency.count({
            where: { status: 'CANCELLED' },
        });
        const needVolunteers = await this.prisma.emergency.count({
            where: {
                status: 'ACTIVE',
                needVolunteer: true,
            },
        });

        // Stats untuk security
        const securityResponses = await this.prisma.emergencyResponse.count();
        const securityActive = await this.prisma.emergencyResponse.count({
            where: {
                status: { in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDLING'] }
            }
        });

        // Stats berdasarkan severity
        const lowSeverity = await this.prisma.emergency.count({
            where: { severity: 'LOW' }
        });
        const mediumSeverity = await this.prisma.emergency.count({
            where: { severity: 'MEDIUM' }
        });
        const highSeverity = await this.prisma.emergency.count({
            where: { severity: 'HIGH' }
        });
        const criticalSeverity = await this.prisma.emergency.count({
            where: { severity: 'CRITICAL' }
        });

        return {
            overview: {
                total,
                active,
                resolved,
                cancelled,
                needVolunteers,
            },
            severity: {
                low: lowSeverity,
                medium: mediumSeverity,
                high: highSeverity,
                critical: criticalSeverity
            },
            security: {
                totalResponses: securityResponses,
                activeResponses: securityActive,
                securityOnDuty: await this.prisma.security.count({
                    where: { isOnDuty: true }
                })
            },
            volunteers: {
                total: await this.prisma.volunteer.count(),
                approved: await this.prisma.volunteer.count({
                    where: { status: 'APPROVED' }
                }),
                pending: await this.prisma.volunteer.count({
                    where: { status: 'REGISTERED' }
                })
            }
        };
    }

    // === METHODS UNTUK SECURITY INTEGRATION ===

    // Security menerima emergency
    async acceptEmergency(securityId: number, emergencyId: number) {
        const emergency = await this.getEmergencyById(emergencyId);

        // Update emergency response status
        await this.prisma.emergencyResponse.updateMany({
            where: {
                emergencyId,
                securityId
            },
            data: {
                status: 'EN_ROUTE',
                responseTime: Math.floor((new Date().getTime() - new Date(emergency.createdAt).getTime()) / 1000)
            }
        });

        // Update security status
        await this.prisma.security.update({
            where: { id: securityId },
            data: {
                emergencyCount: { increment: 1 }
            }
        });

        // Buat notifikasi untuk user
        if (emergency.userId) {
            await this.prisma.notification.create({
                data: {
                    title: 'Security Sedang Menuju Lokasi',
                    message: `Security sedang dalam perjalanan menuju lokasi emergency Anda.`,
                    type: 'EMERGENCY' as any,
                    userId: emergency.userId,
                    relatedEntityId: emergencyId.toString(),
                    relatedEntityType: 'EMERGENCY',
                    createdBy: securityId,
                    icon: 'shield',
                    iconColor: '#007AFF'
                }
            });
        }

        return { success: true, message: 'Emergency accepted' };
    }

    // Security tiba di lokasi
    async arriveAtEmergency(securityId: number, emergencyId: number) {
        const response = await this.prisma.emergencyResponse.findFirst({
            where: {
                emergencyId,
                securityId,
                status: 'EN_ROUTE'
            }
        });

        if (!response) {
            throw new BadRequestException('Security belum menerima emergency ini');
        }

        await this.prisma.emergencyResponse.update({
            where: { id: response.id },
            data: {
                status: 'ARRIVED',
                arrivedAt: new Date()
            }
        });

        // Notify user
        const emergency = await this.getEmergencyById(emergencyId);
        if (emergency.userId) {
            await this.prisma.notification.create({
                data: {
                    title: 'Security Telah Tiba',
                    message: `Security telah tiba di lokasi emergency.`,
                    type: 'EMERGENCY' as any,
                    userId: emergency.userId,
                    relatedEntityId: emergencyId.toString(),
                    relatedEntityType: 'EMERGENCY',
                    createdBy: securityId,
                    icon: 'check-circle',
                    iconColor: '#34C759'
                }
            });
        }

        return { success: true, message: 'Arrival confirmed' };
    }

    // Security selesaikan emergency
    async completeEmergency(securityId: number, emergencyId: number, actionTaken: string, notes?: string) {
        const response = await this.prisma.emergencyResponse.findFirst({
            where: {
                emergencyId,
                securityId,
                status: { in: ['ARRIVED', 'HANDLING'] }
            }
        });

        if (!response) {
            throw new BadRequestException('Security belum tiba di lokasi emergency');
        }

        await this.prisma.emergencyResponse.update({
            where: { id: response.id },
            data: {
                status: 'RESOLVED',
                actionTaken,
                notes,
                completedAt: new Date()
            }
        });

        // Update emergency status
        await this.prisma.emergency.update({
            where: { id: emergencyId },
            data: {
                status: 'RESOLVED',
                updatedAt: new Date()
            }
        });

        // Notify user
        const emergency = await this.getEmergencyById(emergencyId);
        if (emergency.userId) {
            await this.prisma.notification.create({
                data: {
                    title: 'Emergency Telah Ditangani',
                    message: `Emergency telah berhasil ditangani oleh security.`,
                    type: 'EMERGENCY' as any,
                    userId: emergency.userId,
                    relatedEntityId: emergencyId.toString(),
                    relatedEntityType: 'EMERGENCY',
                    createdBy: securityId,
                    icon: 'thumbs-up',
                    iconColor: '#FF9500'
                }
            });
        }

        return { success: true, message: 'Emergency completed' };
    }

    // Get emergencies untuk security dashboard
    async getSecurityEmergencies() {
        return this.prisma.emergency.findMany({
            where: {
                status: 'ACTIVE',
                alarmSent: true
            },
            include: {
                volunteers: true,
                emergencyResponses: {
                    include: {
                        security: {
                            select: {
                                id: true,
                                nama: true,
                                nomorTelepon: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        namaLengkap: true,
                        nomorTelepon: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    // Get security statistics
    async getSecurityStats(securityId?: number) {
        const whereClause = securityId ? { securityId } : {};

        const totalResponses = await this.prisma.emergencyResponse.count({
            where: whereClause
        });

        const activeResponses = await this.prisma.emergencyResponse.count({
            where: {
                ...whereClause,
                status: {
                    in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDLING']
                }
            }
        });

        const averageResponseTime = await this.prisma.emergencyResponse.aggregate({
            where: {
                ...whereClause,
                responseTime: { gt: 0 }
            },
            _avg: {
                responseTime: true
            }
        });

        const resolvedResponses = await this.prisma.emergencyResponse.count({
            where: {
                ...whereClause,
                status: 'RESOLVED'
            }
        });

        return {
            totalResponses,
            activeResponses,
            resolvedResponses,
            averageResponseTime: Math.round(averageResponseTime._avg.responseTime || 0),
            completionRate: totalResponses > 0 ?
                ((resolvedResponses / totalResponses) * 100).toFixed(2) : '0.00'
        };
    }
}