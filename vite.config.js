import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/mediapipe": {
        target: "http://localhost:5173", // Dit kan de lokale server zijn waar je Mediapipe-bestanden serveert
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mediapipe/, ""),
      },

      "/api": {
        target: "https://rebilt-backend.onrender.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
      },
    },
  },
});
