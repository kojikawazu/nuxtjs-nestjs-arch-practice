import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'node:crypto';
import { LessThan, Repository } from 'typeorm';
import type {
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../../application/ports/refresh-token-repository.port';
import { RefreshTokenOrmEntity } from '../entities/refresh-token.orm-entity';

/**
 * RefreshTokenRepository Port の TypeORM 実装（infrastructure 層）。
 * SHA-256 ハッシュ化・定数時間比較といった保管の詳細をここに閉じ込め、application には見せない。
 */
@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repo: Repository<RefreshTokenOrmEntity>,
  ) {}

  async save(userId: string, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = TypeOrmRefreshTokenRepository.hash(token);
    // 期限切れの古い行を掃除しつつ新規行を保存
    await this.repo.delete({ userId, expiresAt: LessThan(new Date()) });
    await this.repo.save(this.repo.create({ userId, tokenHash, expiresAt }));
  }

  async findMatch(userId: string, token: string): Promise<StoredRefreshToken | null> {
    const rows = await this.repo.find({ where: { userId } });
    const incoming = Buffer.from(TypeOrmRefreshTokenRepository.hash(token));
    for (const row of rows) {
      const candidate = Buffer.from(row.tokenHash);
      if (candidate.length === incoming.length && timingSafeEqual(candidate, incoming)) {
        return { id: row.id, userId: row.userId };
      }
    }
    return null;
  }

  /**
   * DELETE の影響行数をそのまま排他判定に使う（同一行を消せるのは 1 回だけ）。
   * DB が行ロックで直列化するため、追加のトランザクションやロックを持ち込まずに
   * 「勝者が 1 つだけ」を保証できる。
   */
  async consumeById(id: string): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  /**
   * リフレッシュトークン（JWT）は高エントロピーかつ 72 バイトを超えるため、
   * bcrypt（72 バイトで切り捨て）ではなく SHA-256 でトークン全体をハッシュする。
   */
  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
