import { afterEach } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';

/**
 * 各テストの後で、マウントしたコンポーネントをすべて unmount する setupFiles。
 *
 * 本番ではページを離れるとコンポーネントは unmount されるが、テストは明示しない限りマウントしたまま残る。
 * Nuxt 4 は同じキーの useAsyncData をマウント中のコンポーネント間で共有するため、残ったコンポーネントが
 * 前のテストのデータを保持し、次のテストに漏れる（ssr の確認画面のテストで、前のケースの draft が表示された）。
 */
enableAutoUnmount(afterEach);
