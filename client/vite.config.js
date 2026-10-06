import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies the API and uploaded images to the Express backend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
