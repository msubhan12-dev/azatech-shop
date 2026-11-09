import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './common/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  // Disable ETag to prevent 304 responses with empty body
  app.getHttpAdapter().getInstance().set('etag', false);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Audit logging
  app.useGlobalInterceptors(new AuditInterceptor(app.get(PrismaService)));

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  // Swagger + OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Online Shop - Order Management API')
    .setDescription(
      'Production-grade order management system with inventory control, state machine, and BullMQ job processing',
    )
    .setVersion('1.0.0')
    .setContact('Azatech Support', 'https://azatech.id', 'support@azatech.id')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3001', 'Local Development')
    .addServer('https://api.azatech.id', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log(`API running on port ${process.env.PORT || 3001}`);
  console.log(`📚 Swagger UI Documentation: http://localhost:${process.env.PORT || 3001}/docs`);
}

bootstrap();
