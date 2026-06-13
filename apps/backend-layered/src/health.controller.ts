import { Controller, Get } from '@nestjs/common';

/** 死活監視・E2E のサーバ起動待ち用エンドポイント。 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
