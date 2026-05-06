import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2024",
  },
  plugins: [vue()],
});
