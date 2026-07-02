import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type {
  AuthTokens,
  DryRunResult,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '@app/api-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { toLoginInput } from '../application/inputs/login.input';
import { toRegisterInput } from '../application/inputs/register.input';
import { LoginUseCase } from '../application/usecases/login.usecase';
import { LogoutUseCase } from '../application/usecases/logout.usecase';
import { RefreshUseCase } from '../application/usecases/refresh.usecase';
import { RegisterUseCase } from '../application/usecases/register.usecase';
import { RegisterValidator } from '../application/validators/register.validator';
import type { AuthenticatedUser } from '../auth.types';
import { loginSchema } from './dto/login.dto';
import { refreshSchema } from './dto/refresh.dto';
import { registerSchema } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * 認証の HTTP 入口（presentation 層）。
 * DTO 検証に専念し、DTO → application の Input に詰め替えてから各ユースケース／バリデータへ委譲する。
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

  @Post('register')
  @HttpCode(201)
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterRequest,
  ): Promise<AuthTokens> {
    return this.registerUser.execute(toRegisterInput(body));
  }

  @Post('register/validate')
  @HttpCode(200)
  async registerValidate(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterRequest,
  ): Promise<DryRunResult> {
    await this.registerValidator.execute(toRegisterInput(body));
    return { valid: true };
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginRequest): Promise<AuthTokens> {
    return this.loginUser.execute(toLoginInput(body));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshRequest): Promise<AuthTokens> {
    return this.refreshSession.execute(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.logoutUser.execute(user.userId);
  }
}
