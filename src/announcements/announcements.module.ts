// src/announcements/announcements.module.ts
import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module'; // ✅ TAMBAHKAN INI

@Module({
  imports: [
    PrismaModule,
    NotificationModule, // ✅ IMPORT NotificationModule
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule { }