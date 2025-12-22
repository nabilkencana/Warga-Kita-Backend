import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { IoAdapter } from '@nestjs/platform-socket.io';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS untuk Vercel
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://wargakita.canadev.my.id',
      // Tambahkan domain Vercel Anda
      'https://canadev.my.id',
      '*.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Socket.io adapter untuk WebSocket di Vercel
  app.useWebSocketAdapter(new IoAdapter(app));

  // Gunakan port dari Vercel environment variable
  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Logger hanya di development
  if (process.env.NODE_ENV !== 'production') {
    const logger = new Logger('Bootstrap');
    logger.log(`========================================`);
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`🔌 REST API available at: http://localhost:${port}/api`);
    logger.log(`📡 WebSocket available at: ws://localhost:${port}/notifications`);
    logger.log(`📊 Health check: http://localhost:${port}/api/health`);
    logger.log(`========================================`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  }
}

// Handler untuk Vercel Serverless Functions
export default async function handler(req: any, res: any) {
  await bootstrap();
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}

// Untuk development
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}