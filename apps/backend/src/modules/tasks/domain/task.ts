import type { TaskStatus } from '@app/api-client';
import { InvalidDateRangeError, TaskAccessDeniedError } from './task-errors';

/**
 * タスクのドメインモデル（domain 層）。
 *
 * NestJS にも TypeORM にも依存しない純粋な TypeScript。業務ルール（開始≤終了の不変条件・
 * 所有者認可）をここに集約し、永続化（DB）や配信（HTTP）の都合は持ち込まない。
 *
 * 値は「日時は Date」「未設定は null」で正規化して扱う。ISO 文字列⇄Date や
 * contract 形（@app/api-client）への変換は presentation 層の mapper が担う。
 */

/** 新規作成時に渡す入力（id・作成/更新日時は未確定）。status 未指定は既定 'todo'。 */
export interface NewTaskInput {
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus | null;
  startDate: Date;
  endDate: Date | null;
  url: string | null;
}

/** 部分更新の入力。キーが存在する＝そのフィールドを更新する（undefined は「未指定」）。 */
export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date | null;
  url?: string | null;
}

/** 永続化済みタスクの全フィールド（DB から復元する際の素材）。 */
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

/** 開始・終了が両方あるとき、終了が開始より前なら不変条件違反。 */
function assertDateOrder(start: Date, end: Date | null): void {
  if (end && end.getTime() < start.getTime()) {
    throw new InvalidDateRangeError();
  }
}

/**
 * まだ永続化されていない新規タスク（id・日時は DB 採番）。
 * 生成時点で既定値の適用と開始≤終了の検証を済ませる＝「不正な下書きは存在し得ない」。
 */
export class TaskDraft {
  readonly userId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly url: string | null;

  private constructor(input: NewTaskInput) {
    assertDateOrder(input.startDate, input.endDate);
    this.userId = input.userId;
    this.title = input.title;
    this.description = input.description;
    this.status = input.status ?? 'todo';
    this.startDate = input.startDate;
    this.endDate = input.endDate;
    this.url = input.url;
  }

  static create(input: NewTaskInput): TaskDraft {
    return new TaskDraft(input);
  }
}

/**
 * 永続化済みのタスク集約。所有者認可と更新ロジック（不変条件の再検証込み）を持つ。
 */
export class Task {
  readonly id: string;
  readonly userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  startDate: Date;
  endDate: Date | null;
  url: string | null;
  imageUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(state: TaskState) {
    this.id = state.id;
    this.userId = state.userId;
    this.title = state.title;
    this.description = state.description;
    this.status = state.status;
    this.startDate = state.startDate;
    this.endDate = state.endDate;
    this.url = state.url;
    this.imageUrl = state.imageUrl;
    this.createdAt = state.createdAt;
    this.updatedAt = state.updatedAt;
  }

  /** DB から読み出した素材でドメインを復元する。 */
  static fromState(state: TaskState): Task {
    return new Task(state);
  }

  /** 所有者でなければ 403 相当のドメインエラー。 */
  assertOwnedBy(userId: string): void {
    if (this.userId !== userId) {
      throw new TaskAccessDeniedError();
    }
  }

  /** 指定されたフィールドのみ反映し、反映後の開始≤終了を再検証する。 */
  applyUpdate(patch: TaskUpdateInput): void {
    if (patch.title !== undefined) this.title = patch.title;
    if (patch.description !== undefined) this.description = patch.description ?? null;
    if (patch.status !== undefined) this.status = patch.status;
    if (patch.startDate !== undefined) this.startDate = patch.startDate;
    if (patch.endDate !== undefined) this.endDate = patch.endDate ?? null;
    if (patch.url !== undefined) this.url = patch.url ?? null;
    assertDateOrder(this.startDate, this.endDate);
  }

  /**
   * 更新を反映「したら」不変条件を満たすかだけを検証する（DryRun 用・状態は変えない）。
   */
  assertUpdatable(patch: TaskUpdateInput): void {
    const start = patch.startDate ?? this.startDate;
    const end = patch.endDate !== undefined ? patch.endDate : this.endDate;
    assertDateOrder(start, end);
  }

  /** 画像の公開パスを設定する。 */
  attachImage(publicPath: string): void {
    this.imageUrl = publicPath;
  }

  /** 画像を外す。 */
  detachImage(): void {
    this.imageUrl = null;
  }
}
