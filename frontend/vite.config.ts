import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'robots.txt', 'offline.html'],
      manifest: {
        name: 'Mini Messenger',
        short_name: 'Messenger',
        description: 'Modern secure messaging app with end-to-end encryption, video calls, and group chat',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          }
        ]
      },
      workbox: {
        // Maximum cache size to prevent excessive storage usage
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        // Clean up old caches
        cleanupOutdatedCaches: true,

        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        clientsClaim: true,

        // Don't use navigation fallback - it causes false offline detection during reload
        // navigateFallback: '/offline.html',
        // navigateFallbackDenylist: [/^\/api\//],

        // Runtime caching strategies
        runtimeCaching: [
          // API responses - Network First (stale-while-revalidate)
          {
            urlPattern: /^http:\/\/localhost:4000\/api\/(messages|conversations|contacts)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 30, // Increased timeout to prevent false offline detection
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // User profiles and avatars - Cache First
          {
            urlPattern: /^http:\/\/localhost:4000\/api\/(users|profiles)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'user-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Static assets (images, fonts, etc.) - Cache First
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // File uploads/downloads - Network Only (don't cache)
          {
            urlPattern: /^http:\/\/localhost:4000\/api\/files/,
            handler: 'NetworkOnly',
          },
          // WebSocket connections - Network Only
          {
            urlPattern: /socket\.io/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in development for easier debugging
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Set chunk size warning limit to 500kb
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy for better caching
        manualChunks: {
          // React core - highest priority, loaded first
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries that depend on React
          'vendor-ui': ['@radix-ui/react-toast', '@radix-ui/react-slot', '@radix-ui/react-tooltip', 'lucide-react'],
        },
      },
    },
    // Enable source maps for production debugging (optional)
    sourcemap: mode === "production" ? false : true,
  },
}));
