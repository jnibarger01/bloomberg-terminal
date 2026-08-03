import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/bloomberg-terminal/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    server: {
      hmr: env.DISABLE_HMR !== 'true',
      watch: env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false
        },
        '/auth': {
          target: env.VITE_BACKEND_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false
        },
        '/health': {
          target: env.VITE_BACKEND_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
