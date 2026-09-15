import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

export default defineConfig((_env) => ({
  plugins: [dts()],
  build: {
    lib: {
      formats: ["es", "cjs"],
      entry: "./src/index.ts",
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
}));
