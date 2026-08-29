import type { TaskStatus } from '@app/api-client';
import { TaskAccessDeniedError } from '../errors/task.errors';
import { DateRange } from '../value-objects/date-range';

/** 永続化済みタスクの全状態。infrastructure のマッパーと domain だけが扱う内部表現。 */
export interface TaskState {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** 開始・終了は対で 1 つの不変条件（開始 ≤ 終了）を持つため VO にまとめる。 */
  period: DateRange;
  url: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 新規作成時に確定する属性（id / 日時は永続化時に付与されるため持たない）。 */
export interface NewTask {
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  period: DateRange;
  url: string | null;
}

/** 部分更新の入力（指定されたフィールドのみ反映する）。 */
export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date | null;
  url?: string | null;
}

/**
 * タスクのドメインエンティティ（フレームワーク非依存）。
 *
 * 認可（所有チェック）・日付の不変条件・画像の付け外しといった業務ルールを保持する。
 * TypeORM や HTTP は一切知らず、永続化は repository（Port）に委ねる。
 */
export class Task {
  private constructor(private readonly state: TaskState) {}

  /** 永続化済み状態から復元する（infrastructure のマッパーが使用）。 */
  static fromState(state: TaskState): Task {
    return new Task({ ...state });
  }

  /**
   * 新規作成の属性を組み立てる。status 既定は todo、未指定は null、開始≤終了を検証する。
   * 実際の保存（id/日時の付与）は repository が行う。
   */
  static draft(input: {
    userId: string;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    startDate: Date;
    endDate: Date | null;
    url?: string | null;
  }): NewTask {
    return {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      // 開始 ≤ 終了は DateRange の生成時に検査される（検証呼び出しを覚えておく必要がない）
      period: DateRange.of(input.startDate, input.endDate),
      url: input.url ?? null,
    };
  }

  get id(): string {
    return this.state.id;
  }

  get imageUrl(): string | null {
    return this.state.imageUrl;
  }

  /** 非所有なら TaskAccessDeniedError。 */
  assertOwnedBy(userId: string): void {
    if (this.state.userId !== userId) {
      throw new TaskAccessDeniedError();
    }
  }

  /** 指定フィールドのみ反映する。期間はマージ後の値で不変条件が検査される。 */
  applyUpdate(patch: TaskUpdate): void {
    // 期間を先に組み立てる。VO の生成時点で検査されるため、不正な更新では
    // state を一切書き換えないまま例外になる（部分的に壊れた状態を作らない）。
    const period = this.mergePeriod(patch);
    if (patch.title !== undefined) this.state.title = patch.title;
    if (patch.description !== undefined) this.state.description = patch.description ?? null;
    if (patch.status !== undefined) this.state.status = patch.status;
    if (patch.url !== undefined) this.state.url = patch.url ?? null;
    this.state.period = period;
  }

  /** 未指定のフィールドは現在値を引き継いで、更新後に確定する期間を組み立てる。 */
  private mergePeriod(patch: TaskUpdate): DateRange {
    const start = patch.startDate ?? this.state.period.start;
    const end = patch.endDate !== undefined ? (patch.endDate ?? null) : this.state.period.end;
    return DateRange.of(start, end);
  }

  /** 画像パスを差し替え、差し替え前のパスを返す（呼び出し側が旧ファイル掃除に使う）。 */
  attachImage(publicPath: string): string | null {
    const previous = this.state.imageUrl;
    this.state.imageUrl = publicPath;
    return previous;
  }

  /** 画像を外し、外す前のパスを返す。 */
  detachImage(): string | null {
    const previous = this.state.imageUrl;
    this.state.imageUrl = null;
    return previous;
  }

  /** 現在の状態のスナップショット（infrastructure の保存・契約変換が使用）。 */
  toState(): TaskState {
    return { ...this.state };
  }
}
