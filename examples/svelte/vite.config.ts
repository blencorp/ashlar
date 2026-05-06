import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2024",
  },
  plugins: [svelte()],
});
