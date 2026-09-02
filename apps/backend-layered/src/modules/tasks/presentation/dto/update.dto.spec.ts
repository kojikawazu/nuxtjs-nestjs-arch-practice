import { updateTaskSchema } from './update.dto';

/**
 * updateTaskSchema（zod）単体。
 *
 * 更新スキーマの要点は「**キーが無い＝変更しない**」と「**null＝削除する**」を区別することで、
 * これが崩れると利用者は説明・期限・URL を消せない（消したつもりでも保存後に元の値が戻る）。
 * 値そのものの検証ルールは createTaskSchema から継承しているので、ここでは nullable の扱いに絞る。
 */
describe('updateTaskSchema', () => {
  it('正常系: 空オブジェクト（何も変更しない）は合格する', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(true);
  });

  it.each(['description', 'endDate', 'url'])('正常系: 任意項目 %s の null は合格する', (field) => {
    expect(updateTaskSchema.safeParse({ [field]: null }).success).toBe(true);
  });

  it('正常系: 任意項目の null を同時に指定できる', () => {
    const parsed = updateTaskSchema.safeParse({ description: null, endDate: null, url: null });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({
      description: null,
      endDate: null,
      url: null,
    });
  });

  // 必須項目は「消す」対象ではない（null を通すと保存時に必須が欠ける）
  it.each(['title', 'status', 'startDate'])('準正常系: 必須項目 %s の null は不合格', (field) => {
    expect(updateTaskSchema.safeParse({ [field]: null }).success).toBe(false);
  });

  // 値そのもののルールは createTaskSchema から継承している（同じルールを 2 か所に書かない）
  it('準正常系: 値を指定する場合は作成時と同じルールで検証される', () => {
    expect(updateTaskSchema.safeParse({ title: '' }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ endDate: '2026-04-31' }).success).toBe(false);
  });

  it('異常系: 未知キーは .strict() で不合格（partial/extend でも維持される）', () => {
    expect(updateTaskSchema.safeParse({ owner: 'someone-else' }).success).toBe(false);
  });
});
