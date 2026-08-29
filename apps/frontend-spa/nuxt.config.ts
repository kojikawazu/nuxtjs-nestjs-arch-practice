// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // アクセストークンをメモリ保持する設計に合わせ SPA（クライアントレンダリング）にする
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/test-utils/module'],
  css: ['flatpickr/dist/flatpickr.css'],
  runtimeConfig: {
    // サーバ側（Nitro BFF → backend）。NUXT_API_BASE_URL で上書き可。
    apiBaseUrl: 'http://localhost:3001',
    public: {
      // クライアント側（tasks を backend へ直接）。NUXT_PUBLIC_API_BASE_URL で上書き可。
      apiBaseUrl: 'http://localhost:3001',
      // 添付画像の上限バイト数。backend の MAX_UPLOAD_BYTES と同じ値を入れる
      // （ここを固定値のままにすると、運用で上限を変えたときフォームだけ古い値で弾く）。
      // NUXT_PUBLIC_MAX_UPLOAD_BYTES で上書き可。
      maxUploadBytes: 2097152,
    },
  },
  typescript: {
    typeCheck: false,
  },
});
