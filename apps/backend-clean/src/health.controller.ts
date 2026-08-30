import { Controller, Get } from '@nestjs/common';

/** 死活監視・E2E のサーバ起動待ち用エンドポイント。 */
@Controller('health')
export class HealthController {
  /**
   * 死活チェック（E2E のサーバ起動待ちにも使う）。
   * 実API: GET /health
   * @returns 死活状態を表す固定レスポンス（常に 200。型はシグネチャが真実）
   */
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
