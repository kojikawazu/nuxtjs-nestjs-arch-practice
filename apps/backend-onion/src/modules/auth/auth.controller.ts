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

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterRequest): Promise<AuthTokens> {
    return this.auth.register(dto);
  }

  @Post('register/validate')
  @HttpCode(200)
  async registerValidate(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterRequest,
  ): Promise<DryRunResult> {
    await this.auth.validateRegister(dto);
    return { valid: true };
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginRequest): Promise<AuthTokens> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshRequest): Promise<AuthTokens> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.logout(user.userId);
  }
}
