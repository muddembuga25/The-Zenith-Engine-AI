
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables, regardless of VITE_ prefix
  // This ensures API_KEY and others are available to the client build
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // detailed stringify prevents "process is not defined" crashes in browser
      'process.env': JSON.stringify(env),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    },
    server: {
      port: 3000,
      host: true
    }
  };
});
