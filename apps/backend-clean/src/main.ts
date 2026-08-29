import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/presentation/filters/http-exception.filter';
import { loadOpenApiDocument } from './config/openapi';
import { configureUploadStatic } from './config/static-assets';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 入力検証はルート単位の ZodValidationPipe（presentation/dto の zod スキーマ）で行うため、
  // グローバル ValidationPipe は使わない
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true, credentials: true });

  // 添付画像の静的配信（/uploads）。保存先は upload.dir（compose では volume）。
  configureUploadStatic(app, app.get(ConfigService));

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
