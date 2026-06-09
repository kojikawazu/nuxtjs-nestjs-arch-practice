import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import UrlPreview from '~/components/UrlPreview.vue';

/**
 * UrlPreview の単体テスト。
 * 「http/https のときだけリンクを描画し、危険スキームはリンクを出さない」描画時ガードを検証する。
 */
describe('UrlPreview', () => {
  it('正常系: https URL はリンクを描画し、rel と target が安全に設定される', async () => {
    const wrapper = await mountSuspended(UrlPreview, {
      props: { url: 'https://example.com/path' },
    });

    const link = wrapper.find('[data-testid="url-preview-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('https://example.com/path');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
    // ホスト名が見出しとして表示される
    expect(link.text()).toContain('example.com');
  });

  it('異常系: javascript: スキームはリンクを描画せず「無効な URL」を表示する', async () => {
    const wrapper = await mountSuspended(UrlPreview, {
      props: { url: 'javascript:alert(1)' },
    });

    expect(wrapper.find('[data-testid="url-preview-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="url-preview-invalid"]').exists()).toBe(true);
  });

  it('異常系: data: スキームもリンクを描画しない', async () => {
    const wrapper = await mountSuspended(UrlPreview, {
      props: { url: 'data:text/html,<script>alert(1)</script>' },
    });

    expect(wrapper.find('[data-testid="url-preview-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="url-preview-invalid"]').exists()).toBe(true);
  });

  it('準正常系: url 未指定なら（なし）を表示する', async () => {
    const wrapper = await mountSuspended(UrlPreview, { props: {} });

    expect(wrapper.find('[data-testid="url-preview-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="url-preview-empty"]').exists()).toBe(true);
  });
});
