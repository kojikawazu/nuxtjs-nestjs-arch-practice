import { z } from 'zod';
import { isSafeHttpUrl } from './safeUrl';

/**
 * TaskForm のクライアント側入力検証スキーマ（zod）。
 *
 * フォームの生値（すべて文字列。日付は `YYYY-MM-DD`）を検証し、フィールド別のエラーメッセージを返す。
 * 開始必須・開始 ≤ 終了・URL は http/https のみ、といった規則を集約する
 * （画像 MIME/サイズは File 実体の検証なのでフォーム側 `onFileChange` に残す）。
 */
export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'タイトルは必須です')
      .max(120, 'タイトルは120文字以内で入力してください'),
    description: z.string().max(2000, '説明は2000文字以内で入力してください'),
    startDate: z.string(),
    endDate: z.string(),
    url: z.string(),
  })
  .superRefine((v, ctx) => {
    // 開始必須 → 開始 ≤ 終了（開始が無いうちは終了の比較はしない）
    if (v.startDate === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: '開始日は必須です',
      });
    } else if (v.endDate !== '' && v.endDate < v.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: '終了日は開始日以降にしてください',
      });
    }

    // 関連 URL（任意）。http/https のみ許可し、長さ・スキームを検証する。
    const trimmedUrl = v.url.trim();
    if (trimmedUrl !== '') {
      if (trimmedUrl.length > 2048) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: 'URL は2048文字以内で入力してください',
        });
      } else if (!isSafeHttpUrl(trimmedUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: 'http:// または https:// で始まる URL を入力してください',
        });
      }
    }
  });

export type TaskFormFields = z.infer<typeof taskFormSchema>;
