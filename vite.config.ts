import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path. This makes the build portable to any domain or subdirectory
  // (e.g. works on Vercel, Netlify, GitHub Pages, or a local folder)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Optimize chunk size for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
          vision: ['@mediapipe/tasks-vision']
        }
      }
    }
  },
  server: {
    host: true // Expose to network for mobile testing during dev
  }
});