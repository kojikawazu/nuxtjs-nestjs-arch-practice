import { createTaskSchema } from './create.dto';

/**
 * createTaskSchema（zod）単体。
 * 契約の入力ルール（title 必須・status 列挙・ISO 日付・url は http/https のみ・未知キー拒否）を検証する。
 */
describe('createTaskSchema', () => {
  const base = { title: 'タスク', startDate: '2026-06-10T00:00:00.000Z' };

  it('正常系: 最小フィールド（title + startDate）は合格する', () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });

  it('正常系: 日付のみ（2026-01-01）の startDate も許可する', () => {
    expect(createTaskSchema.safeParse({ ...base, startDate: '2026-01-01' }).success).toBe(true);
  });

  it('正常系: https の url は合格する', () => {
    expect(createTaskSchema.safeParse({ ...base, url: 'https://example.com/docs' }).success).toBe(
      true,
    );
  });

  it('異常系: title 空は不合格', () => {
    expect(createTaskSchema.safeParse({ ...base, title: '' }).success).toBe(false);
  });

  it('異常系: status が列挙外（archived）は不合格', () => {
    expect(createTaskSchema.safeParse({ ...base, status: 'archived' }).success).toBe(false);
  });

  it('異常系: startDate が日付でない文字列は不合格', () => {
    expect(createTaskSchema.safeParse({ ...base, startDate: 'not-a-date' }).success).toBe(false);
  });

  it('異常系: url が javascript: スキームは不合格（描画時ガード以前に入力で弾く）', () => {
    expect(createTaskSchema.safeParse({ ...base, url: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('異常系: url が 2048 文字超は不合格', () => {
    const tooLong = `https://example.com/${'a'.repeat(2048)}`;
    expect(createTaskSchema.safeParse({ ...base, url: tooLong }).success).toBe(false);
  });

  it('異常系: imageUrl などの未知キーは .strict で不合格（クライアントから imageUrl を設定させない）', () => {
    expect(createTaskSchema.safeParse({ ...base, imageUrl: '/uploads/x.png' }).success).toBe(false);
  });
});
