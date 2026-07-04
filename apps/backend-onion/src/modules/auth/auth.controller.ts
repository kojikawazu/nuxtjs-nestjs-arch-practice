import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type {
  AuthTokens,
  DryRunResult,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '@app/api-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { loginSchema } from './dto/login.dto';
import { refreshSchema } from './dto/refresh.dto';
import { registerSchema } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * 認証の HTTP 入口（presentation 層）。
 * 入力検証（zod Pipe）に専念し、処理は AuthService（application 層）へ委譲する。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * ユーザー登録（成功時トークン発行）
   * 実API: POST /auth/register（成功時 201 Created）
   * 処理の実体: AuthService.register（auth.service.ts）
   *   ※ dto は ZodValidationPipe(registerSchema) で検証済み。メール重複は 409
   * @param dto - RegisterRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterRequest): Promise<AuthTokens> {
    return this.auth.register(dto);
  }

  /**
   * 登録の事前検証（DryRun・ユーザー作成やトークン発行はしない）
   * 実API: POST /auth/register/validate（成功時 200 OK）
   * 処理の実体: AuthService.validateRegister（auth.service.ts）
   *   ※ 入力検証に加えメール重複だけを確認（重複 → 409）
   * @param dto - RegisterRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<DryRunResult>（{ valid: true }。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('register/validate')
  @HttpCode(200)
  async registerValidate(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterRequest,
  ): Promise<DryRunResult> {
    await this.auth.validateRegister(dto);
    return { valid: true };
  }

  /**
   * ログイン（資格情報を検証しトークン発行）
   * 実API: POST /auth/login（成功時 200 OK）
   * 処理の実体: AuthService.login（auth.service.ts）
   *   ※ 認証失敗は 401（ユーザーの有無は区別しない＝列挙防止）
   * @param dto - LoginRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginRequest): Promise<AuthTokens> {
    return this.auth.login(dto);
  }

  /**
   * トークンリフレッシュ（ローテーション）
   * 実API: POST /auth/refresh（成功時 200 OK）
   * 処理の実体: AuthService.refresh（auth.service.ts）
   *   ※ ハッシュ照合 → 旧トークン失効 → 新規発行。無効/使用済みは 401
   * @param dto - RefreshRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（新しい access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshRequest): Promise<AuthTokens> {
    return this.auth.refresh(dto.refreshToken);
  }

  /**
   * ログアウト（リフレッシュトークンを失効）
   * 実API: POST /auth/logout（成功時 204 No Content・要アクセストークン）
   * 処理の実体: AuthService.logout（auth.service.ts）
   *   ※ @UseGuards(JwtAuthGuard) で認証必須。@CurrentUser の userId に紐づく refresh を失効
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @returns Promise<void>（本文なし・204）
   */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.logout(user.userId);
  }
}
