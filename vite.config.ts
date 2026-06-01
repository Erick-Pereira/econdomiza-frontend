import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  // ============================================
  // OTIMIZAÇÃO DE BUILD — Compressão de assets
  // ============================================
  build: {
    // Minificação e compressão do bundle
    minify: 'esbuild',
    // Chunk size limits para monitoramento
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['lucide-react'],
        },
      },
    },
  },
  // ============================================
  // OTIMIZAÇÃO DE IMAGENS — Plugin de compressão
  // ============================================
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'lucide-react'],
  },
});
