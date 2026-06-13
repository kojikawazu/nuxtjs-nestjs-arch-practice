// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // SSR 版。初期 HTML をサーバでレンダリングする。アクセストークンはメモリ（useState）保持のまま、
  // 初期リクエスト時に httpOnly リフレッシュ Cookie からサーバ側でセッションを復元する
  // （plugins/auth-init.ts）。これにより /tasks の直接アクセス・リロードでも SSR で一覧を描画できる。
  ssr: true,
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/test-utils/module'],
  css: ['flatpickr/dist/flatpickr.css'],
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
