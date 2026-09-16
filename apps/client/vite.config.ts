import { defineConfig } from "vite";

export default defineConfig((_mode) => ({
  plugins: [],
  server: {
    proxy: {
      "/backend": {
        target: process.env.SERVER_URL || "https://localhost:3000/",
        changeOrigin: true,
        rewrite: (path) => path.replace(/\/backend/, ""),
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
}));
