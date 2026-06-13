import type { TaskStatus } from '@app/api-client';
import { InvalidDateRangeError, TaskAccessDeniedError } from './task.errors';

/** 永続化済みタスクの全状態。infrastructure のマッパーと domain だけが扱う内部表現。 */
export interface TaskState {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  startDate: Date;
  endDate: Date | null;
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
  startDate: Date;
  endDate: Date | null;
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

/** 開始 ≤ 終了 の不変条件。両方そろっているときのみ検査する。 */
export function assertDateOrder(start: Date, end: Date | null): void {
  if (end && end.getTime() < start.getTime()) {
    throw new InvalidDateRangeError();
  }
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
    assertDateOrder(input.startDate, input.endDate);
    return {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      startDate: input.startDate,
      endDate: input.endDate,
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

  /** 指定フィールドのみ反映し、反映後の値で開始≤終了を再検証する。 */
  applyUpdate(patch: TaskUpdate): void {
    if (patch.title !== undefined) this.state.title = patch.title;
    if (patch.description !== undefined) this.state.description = patch.description ?? null;
    if (patch.status !== undefined) this.state.status = patch.status;
    if (patch.startDate !== undefined) this.state.startDate = patch.startDate;
    if (patch.endDate !== undefined) this.state.endDate = patch.endDate ?? null;
    if (patch.url !== undefined) this.state.url = patch.url ?? null;
    assertDateOrder(this.state.startDate, this.state.endDate);
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
