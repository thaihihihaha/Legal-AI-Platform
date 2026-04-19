import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Production Build Configuration
 * Optimized for performance, bundle size, and deployment
 */
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Don't emit source maps in production
    sourcemap: false,
    
    // Minify with terser
    minify: 'terser',
    
    // Target browsers
    target: 'es2020',
    
    // Module preload polyfill
    modulePreload: true,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Rollup options
    rollupOptions: {
      output: {
        // Manual code splitting for better caching
        manualChunks: {
          // Vendor libraries
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          
          // Redux & state management
          'redux': [
            '@reduxjs/toolkit',
            'react-redux',
          ],
          
          // HTTP & WebSocket
          'network': [
            'axios',
            'socket.io-client',
          ],
          
          // UI libraries
          'ui': [
            'lucide-react',
          ],
          
          // Phase 4 Dashboard
          'phase4-dashboard': [
            './src/components/phase4/Phase4Dashboard.jsx',
          ],
        },

        // Optimize generated names for caching
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `images/[name].[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name].[hash][extname]`;
          } else if (ext === 'css') {
            return `css/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
      },

      // Optimize dependencies
      external: [
        // Keep as external for CDN delivery if needed
      ],
    },

    // Terser options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500,

    // CommonJS support
    commonjsOptions: {
      include: /node_modules/,
    },
  },

  // Server configuration for development
  server: {
    proxy: {
      '/v1': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'socket.io-client',
    ],
  },
});
