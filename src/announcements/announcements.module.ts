// src/announcements/announcements.module.ts
import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // ✅ TAMBAHKAN INI

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    CloudinaryModule, // ✅ IMPORT CloudinaryModule
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule { }