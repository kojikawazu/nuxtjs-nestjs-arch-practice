import { describe, expect, it } from 'vitest';
import { taskDraftSchema } from '~/server/utils/draft-bff';
import { MAX_DRAFT_BYTES, draftByteLength, isDraftTooLarge } from '~/utils/draftSize';

const baseDraft = {
  title: '牛乳を買う',
  status: 'todo' as const,
  startDate: '2026-06-10T00:00:00.000Z',
};

describe('draftSize', () => {
  it('正常系: 上限に収まる draft は too large と判定しない', () => {
    // エンコード後の長さが上限直下になるよう、1 文字 1 バイトの ASCII で調整する。
    // description キー自体の JSON オーバーヘッドを含めて余白を測る。
    const overhead = draftByteLength({ ...baseDraft, description: '' });
    const draft = { ...baseDraft, description: 'a'.repeat(MAX_DRAFT_BYTES - overhead) };

    expect(draftByteLength(draft)).toBeLessThanOrEqual(MAX_DRAFT_BYTES);
    expect(isDraftTooLarge(draft)).toBe(false);
  });

  it('準正常系: 上限を超える draft は too large と判定する', () => {
    const draft = { ...baseDraft, description: 'a'.repeat(MAX_DRAFT_BYTES + 1) };

    expect(isDraftTooLarge(draft)).toBe(true);
  });

  it('準正常系: 日本語はエンコードで膨らむため、生の文字数が上限内でも too large になる', () => {
    // 「あ」は URL エンコードで %E3%81%82 の 9 文字に膨らむ。生の JSON 長で測る実装だと見逃す境界。
    const draft = { ...baseDraft, description: 'あ'.repeat(500) };

    expect(JSON.stringify(draft).length).toBeLessThan(MAX_DRAFT_BYTES);
    expect(isDraftTooLarge(draft)).toBe(true);
  });
});

describe('taskDraftSchema', () => {
  it('正常系: draft を JSON へ直列化し、スキーマで往復できる', () => {
    const serialized = JSON.stringify({ ...baseDraft, description: 'スーパーで' });

    const parsed = taskDraftSchema.safeParse(JSON.parse(serialized));

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.title).toBe('牛乳を買う');
    expect(parsed.success && parsed.data.description).toBe('スーパーで');
  });

  it('異常系: status が契約外の値なら draft として受け付けない', () => {
    const parsed = taskDraftSchema.safeParse({ ...baseDraft, status: 'archived' });

    expect(parsed.success).toBe(false);
  });

  it('異常系: title が空なら draft として受け付けない', () => {
    const parsed = taskDraftSchema.safeParse({ ...baseDraft, title: '' });

    expect(parsed.success).toBe(false);
  });
});
