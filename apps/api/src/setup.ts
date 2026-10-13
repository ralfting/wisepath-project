import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** How the app handles every request; shared by main.ts and the integration tests */
export function configureApp(app: NestExpressApplication) {
  // Page content travels whole in one request, so allow long pages
  app.useBodyParser('json', { limit: '2mb' });

  // The session travels in an httpOnly cookie
  app.use(cookieParser());

  // Only the web app may call with that cookie
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
  });

  app.setGlobalPrefix('api');
}
