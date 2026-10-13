import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** How the app handles every request; shared by main.ts and the integration tests */
export function configureApp(app: NestExpressApplication) {
  // Page content travels whole in one request, so allow long pages
  app.useBodyParser('json', { limit: '2mb' });

  // Enable cookie parser for httpOnly cookies
  app.use(cookieParser());

  // Enable CORS for development
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');
}
