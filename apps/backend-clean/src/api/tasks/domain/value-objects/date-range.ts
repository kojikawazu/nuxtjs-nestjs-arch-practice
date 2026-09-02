import { InvalidDateRangeError } from '../errors/task.errors';

/**
 * タスクの期間（開始 ≤ 終了）を表す Value Object。
 *
 * - **不変**: 内部の Date は複製して閉じ込め、getter も複製を返す。値を変えるときは新しいインスタンスを作る
 *   （`withStart` / `withEnd`）。共有しても壊れないことが VO の存在価値なので setter を持たせない。
 * - **同一性を持たない**: id は持たず、等価性は属性で決まる（`equals`）。
 * - **不正な状態のインスタンスを作れない**: `of` が不変条件を検査するため、`DateRange` 型の値は
 *   常に「開始 ≤ 終了」を満たす。以前は `assertDateOrder` を呼ぶ側が覚えている必要があったが、
 *   VO 化により**呼び忘れる経路そのものが型で消える**。
 *
 * 単一フィールドの形式（RFC 3339 の日付かどうか等）は presentation の zod が担当し、ここでは扱わない。
 * この VO が担うのは「zod では表現しにくいフィールド間の関係」だけ（→ .claude/rules/stack-backend.md）。
 */
export class DateRange {
  private constructor(
    private readonly startAt: Date,
    private readonly endAt: Date | null,
  ) {}

  /**
   * 期間を組み立てる。終了が開始より前なら InvalidDateRangeError。
   * 渡された Date は呼び出し側で後から変更されうるため、複製して取り込む。
   */
  static of(start: Date, end: Date | null): DateRange {
    if (end && end.getTime() < start.getTime()) {
      throw new InvalidDateRangeError();
    }
    return new DateRange(new Date(start.getTime()), end ? new Date(end.getTime()) : null);
  }

  /** 開始日時（複製を返すので、受け取った側が変更しても VO は壊れない）。 */
  get start(): Date {
    return new Date(this.startAt.getTime());
  }

  /** 終了日時。未設定なら null。 */
  get end(): Date | null {
    return this.endAt ? new Date(this.endAt.getTime()) : null;
  }

  /** 開始だけ差し替えた新しい期間を返す（自身は変わらない）。不変条件は再検査される。 */
  withStart(start: Date): DateRange {
    return DateRange.of(start, this.end);
  }

  /** 終了だけ差し替えた新しい期間を返す（自身は変わらない）。不変条件は再検査される。 */
  withEnd(end: Date | null): DateRange {
    return DateRange.of(this.start, end);
  }

  /** 同一性ではなく属性で等価を判定する（VO の等価性）。 */
  equals(other: DateRange): boolean {
    return (
      this.startAt.getTime() === other.startAt.getTime() &&
      (this.endAt?.getTime() ?? null) === (other.endAt?.getTime() ?? null)
    );
  }
}
