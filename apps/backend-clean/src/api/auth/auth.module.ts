import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token-repository.port';
import { TOKEN_ISSUER } from './application/ports/token-issuer.port';
import { LoginUseCase } from './application/usecases/login.usecase';
import { LogoutUseCase } from './application/usecases/logout.usecase';
import { RefreshUseCase } from './application/usecases/refresh.usecase';
import { RegisterUseCase } from './application/usecases/register.usecase';
import { RegisterValidator } from './application/validators/register.validator';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';
import { JwtTokenIssuer } from './infrastructure/services/jwt-token-issuer';
import { RefreshTokenOrmEntity } from './infrastructure/entities/refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './infrastructure/repositories/typeorm-refresh-token.repository';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtAccessStrategy } from './presentation/strategies/jwt-access.strategy';

/**
 * auth モジュールの DI 配線（クリーンアーキテクチャ）。
 *
 * presentation(Controller/Strategy/Guard) → application(UseCase/Validator) → Port という依存。
 * Port の実体（bcrypt / JWT / TypeORM）は infrastructure 層が提供し、ここで束ねる。
 * UserRepository（Port）は UsersModule が export するものを利用する。
 * → 旧 AuthService（太いサービス）を「1 操作 = 1 ユースケース」＋ Port 群へ分解した形。
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    // シークレットは sign/verify 時に明示指定するため、ここは空登録でよい
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenOrmEntity]),
  ],
  controllers: [AuthController],
  providers: [
    // ユースケース（書き込み）／検証
    RegisterUseCase,
    RegisterValidator,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    // Passport ストラテジ（presentation の認証機構）
    JwtAccessStrategy,
    // Port ↔ 実装のバインド（依存性逆転の要）
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: TypeOrmRefreshTokenRepository },
  ],
})
export class AuthModule {}
