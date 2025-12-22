// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import serverless from 'serverless-http';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

dotenv.config();

let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
    const expressApp = express();

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    // Enable CORS
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://wargakita.canadev.my.id',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init(); // ⬅️ WAJIB untuk serverless

    const logger = new Logger('Bootstrap');
    logger.log('========================================');
    logger.log('🚀 NestJS Serverless initialized (Vercel)');
    logger.log('========================================');

    cachedServer = serverless(expressApp);
  }

  return cachedServer;
}

// ⬅️ INI YANG DICARI VERCEL
export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}
