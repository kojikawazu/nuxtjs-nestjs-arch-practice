import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    // Nuxt ランタイム環境（auto-import / useState / $fetch / registerEndpoint が使える）
    environment: 'nuxt',
    include: ['tests/unit/**/*.spec.ts'],
    setupFiles: ['./tests/setup/msw.ts'],
  },
});
