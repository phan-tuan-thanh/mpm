import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie parser — cần cho refresh token httpOnly cookie
  app.use(cookieParser());

  const port = process.env['BACKEND_PORT'] ?? 3000;
  await app.listen(port);

  console.log(`🚀 Backend đang chạy tại http://localhost:${port}`);
}

bootstrap();
