import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user.repository';
import { UserOrmEntity } from './infrastructure/user.orm-entity';

/**
 * users モジュールの DI 配線（オニオンアーキテクチャ）。
 * UserRepository（domain が所有する契約）の実体を TypeORM 実装に束ね、auth へ Port を export する。
 * （HTTP 入口は持たない＝presentation 層なし。ユーザー参照・作成は auth のユースケースが利用する）
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [{ provide: USER_REPOSITORY, useClass: TypeOrmUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
