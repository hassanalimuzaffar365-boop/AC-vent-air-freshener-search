import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // While developing locally with `vercel dev`, Vercel serves /api itself.
      // This proxy is only used if you run `vite` directly without `vercel dev`.
      '/api': 'http://localhost:3000',
    },
  },
});
