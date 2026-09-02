<script setup lang="ts">
/**
 * 関連 URL の安全なプレビュー（リンクカード）。
 *
 * - http/https のときだけ <a> を描画する（描画時ガード）。
 * - 外部コンテンツは一切読み込まない（iframe / img / サーバ fetch なし）。
 * - target=_blank には rel="noopener noreferrer" を必須付与し、タブナビング・Referer 漏洩を防ぐ。
 */
// null は「関連 URL を空にした」状態（TaskFormValue と同じ意味づけ）。undefined と同じく何も描画しない
const props = defineProps<{ url?: string | null }>();

const safe = computed(() => isSafeHttpUrl(props.url));
const host = computed(() => (props.url ? safeUrlHost(props.url) : ''));
</script>

<template>
  <a
    v-if="safe && url"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    data-testid="url-preview-link"
    class="flex flex-col rounded border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
  >
    <span class="font-medium text-gray-800">🔗 {{ host }}</span>
    <span class="truncate text-gray-500">{{ url }}</span>
    <span class="mt-1 text-xs text-indigo-600">新しいタブで開く ↗</span>
  </a>
  <span v-else-if="url" data-testid="url-preview-invalid" class="text-sm text-red-600">
    無効な URL です
  </span>
  <span v-else data-testid="url-preview-empty" class="text-sm text-gray-500">（なし）</span>
</template>
