import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { loadOpenApiDocument } from './config/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true, credentials: true });

  const logger = new Logger('Bootstrap');

  // TypeSpec 由来の OpenAPI をそのまま Swagger UI (/docs) で配信する
  const openapi = loadOpenApiDocument();
  if (openapi) {
    SwaggerModule.setup('docs', app, openapi);
    logger.log('Swagger UI available at /docs');
  } else {
    logger.warn('OpenAPI spec not found; /docs is disabled. Run `pnpm api:gen`.');
  }

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
}

void bootstrap();
