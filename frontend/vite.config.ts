import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
        manualChunks: (id) => {
          // Vendor chunks - split large dependencies into separate bundles
          if (id.includes("node_modules")) {
            // React core libraries
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
            // UI component libraries
            if (id.includes("@radix-ui") || id.includes("lucide-react")) {
              return "vendor-ui";
            }
            // React Query and data fetching
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            // All other node_modules
            return "vendor-misc";
          }

          // Admin panel - separate chunk for admin-only features
          if (id.includes("/pages/admin/")) {
            return "admin-panel";
          }

          // WebRTC and calling features - heavy component
          if (id.includes("ActiveCall") || id.includes("IncomingCall") || id.includes("OutgoingCall")) {
            return "calling-features";
          }

          // File preview and gallery - heavy component
          if (id.includes("FilePreview") || id.includes("FileGallery")) {
            return "file-features";
          }
        },
      },
    },
    // Enable source maps for production debugging (optional)
    sourcemap: mode === "production" ? false : true,
  },
}));
