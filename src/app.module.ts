import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ReportsModule } from './reports/reports.module';
import { EmergencyModule } from './emergency/emergency.module';
import { AdminModule } from './admin/admin.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BillsModule } from './bills/bills.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationModule } from './notification/notification.module';
import { SecurityController } from './security/security.controller';
import { SecurityService } from './security/security.service';
import { SecurityModule } from './security/security.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),

    // Static files - hanya untuk development
    ...(process.env.NODE_ENV !== 'production' ? [
      ServeStaticModule.forRoot({
        rootPath: join(__dirname, '..', 'public'),
        serveRoot: '/public',
        exclude: ['/api/*'],
      })
    ] : []),

    // Modul-modul aplikasi
    UsersModule,
    AuthModule,
    PrismaModule,
    AnnouncementsModule,
    ReportsModule,
    EmergencyModule,
    AdminModule,
    TransactionsModule,
    BillsModule,
    CloudinaryModule,
    ProfileModule,
    NotificationModule,
    SecurityModule,
    HealthModule,
  ],
  controllers: [AppController, SecurityController, HealthController],
  providers: [AppService, SecurityService],
  exports: [AppService],
})
export class AppModule { }