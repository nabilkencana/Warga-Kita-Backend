// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export default async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS untuk frontend
  app.enableCors();

  const port = process.env.PORT || 1922;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:1922`);
}
bootstrap();

export const maxDuration=100;