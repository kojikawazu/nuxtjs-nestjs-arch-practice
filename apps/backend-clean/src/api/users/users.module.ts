import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user.repository';
import { UserOrmEntity } from './infrastructure/user.orm-entity';

/**
 * users モジュールの DI 配線（クリーンアーキテクチャ）。
 * UserRepository（Port）の実体を TypeORM 実装に束ね、auth など他スライスへ Port を export する。
 * （HTTP 入口は持たない＝presentation 層なし。ユーザー参照・作成は auth のユースケースが利用する）
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [{ provide: USER_REPOSITORY, useClass: TypeOrmUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
