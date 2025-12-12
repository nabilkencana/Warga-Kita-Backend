// src/security/security.module.ts
import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmergencyModule } from '../emergency/emergency.module';

@Module({
    imports: [PrismaModule, EmergencyModule],
    controllers: [SecurityController],
    providers: [SecurityService],
    exports: [SecurityService]
})
export class SecurityModule { }