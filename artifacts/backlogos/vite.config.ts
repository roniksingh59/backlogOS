import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT) || 3000;
const basePath = process.env.BASE_PATH || '/';

let expressAppInstance: any = null;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
            try {
              if (!expressAppInstance) {
                const express = (await import('express')).default;
                const app = express();
                app.use(express.json());
                const { apiRouter } = await import('../../src/api.ts');
                app.use('/api', apiRouter);
                app.use('/', apiRouter);
                expressAppInstance = app;
              }
              return expressAppInstance(req, res, next);
            } catch (err) {
              console.error('API middleware error:', err);
              next(err);
            }
          } else {
            next();
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
