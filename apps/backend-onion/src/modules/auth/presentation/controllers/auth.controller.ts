import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type {
  AuthTokens,
  DryRunResult,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '@app/api-client';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe';
import { CurrentUser } from '../decorators/current-user.decorator';
import { toLoginInput } from '../../application/inputs/login.input';
import { toRegisterInput } from '../../application/inputs/register.input';
import { LoginUseCase } from '../../application/usecases/login.usecase';
import { LogoutUseCase } from '../../application/usecases/logout.usecase';
import { RefreshUseCase } from '../../application/usecases/refresh.usecase';
import { RegisterUseCase } from '../../application/usecases/register.usecase';
import { RegisterValidator } from '../../application/validators/register.validator';
import type { AuthenticatedUser } from '../../auth.types';
import { loginSchema } from '../dto/login.dto';
import { refreshSchema } from '../dto/refresh.dto';
import { registerSchema } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * 認証の HTTP 入口（presentation 層）。
 * 入力検証（zod Pipe）に専念し、DTO → application の Input に詰め替えてから各ユースケース／バリデータへ委譲する。
 * application 側は presentation の DTO を知らない（依存は常に内向き）。
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUseCase,
    private readonly registerValidator: RegisterValidator,
    private readonly loginUser: LoginUseCase,
    private readonly refreshSession: RefreshUseCase,
    private readonly logoutUser: LogoutUseCase,
  ) {}

  /**
   * ユーザー登録（成功時トークン発行）
   * 実API: POST /auth/register（成功時 201 Created）
   * 処理の実体: RegisterUseCase.execute（application/usecases/register.usecase.ts）
   *   ※ body は ZodValidationPipe(registerSchema) で検証後、toRegisterInput で Input に変換。メール重複は 409
   * @param body - RegisterRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('register')
  @HttpCode(201)
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterRequest,
  ): Promise<AuthTokens> {
    return this.registerUser.execute(toRegisterInput(body));
  }

  /**
   * 登録の事前検証（DryRun・ユーザー作成やトークン発行はしない）
   * 実API: POST /auth/register/validate（成功時 200 OK）
   * 処理の実体: RegisterValidator.execute（application/validators/register.validator.ts）
   *   ※ 入力検証に加えメール重複だけを確認（重複 → 409）
   * @param body - RegisterRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<DryRunResult>（{ valid: true }。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('register/validate')
  @HttpCode(200)
  async registerValidate(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterRequest,
  ): Promise<DryRunResult> {
    await this.registerValidator.execute(toRegisterInput(body));
    return { valid: true };
  }

  /**
   * ログイン（資格情報を検証しトークン発行）
   * 実API: POST /auth/login（成功時 200 OK）
   * 処理の実体: LoginUseCase.execute（application/usecases/login.usecase.ts）
   *   ※ 認証失敗は 401（ユーザーの有無は区別しない＝列挙防止）
   * @param body - LoginRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginRequest): Promise<AuthTokens> {
    return this.loginUser.execute(toLoginInput(body));
  }

  /**
   * トークンリフレッシュ（ローテーション）
   * 実API: POST /auth/refresh（成功時 200 OK）
   * 処理の実体: RefreshUseCase.execute（application/usecases/refresh.usecase.ts）
   *   ※ ハッシュ照合 → 旧トークン失効 → 新規発行。無効/使用済みは 401
   * @param body - RefreshRequest（入力 DTO。源: @app/api-client ← packages/api-spec/main.tsp）
   * @returns Promise<AuthTokens>（新しい access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshRequest): Promise<AuthTokens> {
    return this.refreshSession.execute(body.refreshToken);
  }

  /**
   * ログアウト（リフレッシュトークンを失効）
   * 実API: POST /auth/logout（成功時 204 No Content・要アクセストークン）
   * 処理の実体: LogoutUseCase.execute（application/usecases/logout.usecase.ts）
   *   ※ @UseGuards(JwtAuthGuard) で認証必須。@CurrentUser の userId に紐づく refresh を失効
   * @param user - AuthenticatedUser（@CurrentUser が JWT から復元）
   * @returns Promise<void>（本文なし・204）
   */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.logoutUser.execute(user.userId);
  }
}
