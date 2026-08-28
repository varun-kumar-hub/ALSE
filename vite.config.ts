import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cors-bypass-proxy',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url || !req.url.startsWith('/proxy/fetch')) {
            return next();
          }
          let targetUrl = '';
          try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            targetUrl = parsedUrl.searchParams.get('url') || '';
          } catch {}

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }

          (async () => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000);
              const fetchResp = await fetch(targetUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                signal: controller.signal,
              }).finally(() => clearTimeout(timeoutId));

              const body = await fetchResp.text();
              res.statusCode = fetchResp.status;
              res.setHeader('Content-Type', fetchResp.headers.get('content-type') || 'text/html; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(body);
            } catch (err) {
              res.statusCode = 500;
              res.end(String(err));
            }
          })();
        });
      },
    },
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
      },
      '/proxy/opencode': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/opencode/, ''),
      },
      '/proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/openai/, ''),
      },
      '/proxy/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/anthropic/, ''),
      },
      '/proxy/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/gemini/, ''),
      },
      '/proxy/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/nvidia/, ''),
      },
      '/proxy/ddg': {
        target: 'https://html.duckduckgo.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        rewrite: (path) => path.replace(/^\/proxy\/ddg/, ''),
      },
      '/proxy/wikipedia': {
        target: 'https://en.wikipedia.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/wikipedia/, ''),
      },
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
