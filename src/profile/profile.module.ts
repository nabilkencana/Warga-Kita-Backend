// src/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, PrismaService, CloudinaryService],
  exports: [ProfileService],
})
export class ProfileModule { }