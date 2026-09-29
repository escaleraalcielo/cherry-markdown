import { resolve } from 'path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // i18n 运行时只依赖 vue 的 ref/computed，不需要 DOM；
    // 但保留 jsdom 以便后续给组件补测试时不必再改配置。
    environment: 'jsdom',
    globals: true,
    unstubGlobals: true,
  },
});
