import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // У бэкенда (raketka, Spring Boot) нет CORS-конфигурации (WebConfig пуст) —
    // без прокси браузер блокирует запросы с :5173 на :8080. Порт/URL бэка
    // меняется через VITE_BACKEND_URL (см. .env.example).
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
