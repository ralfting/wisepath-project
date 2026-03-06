import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable cookie parser for httpOnly cookies
  app.use(cookieParser());
  
  // Enable CORS for development
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Set global API prefix
  app.setGlobalPrefix('api');
  
  await app.listen(3001);
  console.log(`Application is running on: http://localhost:3001`);
}
bootstrap();
