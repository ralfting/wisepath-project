import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './setup';

/**
 * The API as a Vercel Function: the same Nest app as main.ts, but Vercel
 * owns the server, so the app is built once per instance and each request
 * is handed to its Express instance instead of calling listen().
 */
const app = (async () => {
  const nest = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(nest);
  await nest.init();
  return nest.getHttpAdapter().getInstance();
})();

export async function handler(req: Request, res: Response) {
  const express = await app;
  express(req, res);
}
