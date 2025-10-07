import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://xinudesign.be/offr3d',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
