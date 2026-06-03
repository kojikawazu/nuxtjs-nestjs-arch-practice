// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // アクセストークンをメモリ保持する設計に合わせ SPA（クライアントレンダリング）にする
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/test-utils/module'],
  runtimeConfig: {
    // サーバ側（Nitro BFF → backend）。NUXT_API_BASE_URL で上書き可。
    apiBaseUrl: 'http://localhost:3001',
    public: {
      // クライアント側（tasks を backend へ直接）。NUXT_PUBLIC_API_BASE_URL で上書き可。
      apiBaseUrl: 'http://localhost:3001',
    },
  },
  typescript: {
    typeCheck: false,
  },
});
