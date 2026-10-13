import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  // IPv4 loopback by default; containers set HOST=0.0.0.0 so the published port reaches the app
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
