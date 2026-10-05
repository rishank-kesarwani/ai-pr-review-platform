import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const nodeEnv = configService.get<string>('app.nodeEnv');

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow Swagger UI assets
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(cookieParser());

  // CORS Configuration
  const allowedOrigins = [
    'https://pr-review.rishankkesharwani.com',
    'http://localhost:3000',
    'http://localhost:3001',
    frontendUrl,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://') ||
        origin.includes('rishankkesharwani.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('CORS not allowed for this origin'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-hub-signature-256',
      'x-github-event',
      'x-github-delivery',
      'x-request-id',
    ],
  });

  // Global Prefix: /api/v1 (Exclude /health)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)'],
  });

  // Global Pipes & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('AI PR Review Platform API')
    .setDescription(
      'Production-grade automated AI Pull Request Review Platform API powering AST static analysis, AI reviews, GitHub App webhooks, check runs, and dashboard.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AI PR Review API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Listen on 0.0.0.0 for Render compatibility
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 AI PR Review Backend running in [${nodeEnv}] on port ${port} (0.0.0.0)`);
  logger.log(`📚 Swagger Docs available at http://0.0.0.0:${port}/api/docs`);
  logger.log(`🩺 Health check available at http://0.0.0.0:${port}/health`);
}

bootstrap();
