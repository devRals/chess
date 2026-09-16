import { defineConfig } from "vite";

export default defineConfig((_mode) => ({
  plugins: [],
  resolve: {
    tsconfigPaths: true,
  },
}));
