import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Two independent single-page entry points sharing one Vite project:
    // the student app (index.html) and the admin/counselor analytics
    // dashboard (admin.html). Each has its own React root — see
    // src/main.jsx and src/admin/main.jsx.
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});