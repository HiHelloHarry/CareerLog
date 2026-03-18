import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      // 네이티브 모듈 및 Electron 관련 모듈은 번들링 제외
      external: [
        'active-win',
        '@anthropic-ai/sdk',
      ],
    },
  },
});
