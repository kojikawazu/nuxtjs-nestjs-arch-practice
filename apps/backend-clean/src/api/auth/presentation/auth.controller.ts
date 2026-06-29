import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { AuthTokens, DryRunResult } from '@app/api-client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { toLoginInput } from '../application/inputs/login.input';
import { toRegisterInput } from '../application/inputs/register.input';
import { LoginUseCase } from '../application/usecases/login.usecase';
import { LogoutUseCase } from '../application/usecases/logout.usecase';
import { RefreshUseCase } from '../application/usecases/refresh.usecase';
import { RegisterUseCase } from '../application/usecases/register.usecase';
import { RegisterValidator } from '../application/validators/register.validator';
import type { AuthenticatedUser } from '../auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
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
  register(@Body() dto: RegisterDto): Promise<AuthTokens> {
    return this.registerUser.execute(toRegisterInput(dto));
  }

  @Post('register/validate')
  @HttpCode(200)
  async registerValidate(@Body() dto: RegisterDto): Promise<DryRunResult> {
    await this.registerValidator.execute(toRegisterInput(dto));
    return { valid: true };
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.loginUser.execute(toLoginInput(dto));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.refreshSession.execute(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.logoutUser.execute(user.userId);
  }
}
