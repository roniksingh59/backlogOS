import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './src/api.ts';

// Load environment variables
dotenv.config();

// Also attempt loading .dev.env.json if present
try {
  const envFileCandidates = [
    path.resolve(process.cwd(), '.dev.env.json'),
    path.resolve(import.meta.dirname, '.dev.env.json'),
    path.resolve(process.cwd(), '../.dev.env.json'),
    '/app/.dev.env.json',
  ];
  for (const envFile of envFileCandidates) {
    if (fs.existsSync(envFile)) {
      const devEnv = JSON.parse(fs.readFileSync(envFile, 'utf-8'));
      for (const [key, val] of Object.entries(devEnv)) {
        if (!process.env[key] && typeof val === 'string') {
          process.env[key] = val;
        }
      }
      break;
    }
  }
} catch (e) {
  // Ignore non-fatal env load errors
}

// Global process error handlers to prevent Cloud Run container crashes
process.on('uncaughtException', (err) => {
  console.error('[BacklogOS] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[BacklogOS] Unhandled promise rejection at:', promise, 'reason:', reason);
});

const app = express();
const targetPort = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoints for Google Cloud Run, Kubernetes, and Nginx probes
app.get(['/healthz', '/health', '/_health'], (_req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', apiRouter);

// Resolve static dist directory across varied deployment cwd environments
function resolveStaticDist(): string {
  const possiblePaths = [
    path.resolve(import.meta.dirname, 'artifacts/backlogos/dist'),
    path.resolve(process.cwd(), 'artifacts/backlogos/dist'),
    path.resolve(import.meta.dirname, 'dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), '../artifacts/backlogos/dist'),
    '/app/applet/artifacts/backlogos/dist',
  ];

  for (const candidate of possiblePaths) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  // Fallback to first candidate
  return possiblePaths[0];
}

const staticDist = resolveStaticDist();
if (fs.existsSync(staticDist)) {
  app.use(express.static(staticDist));
}

// Fallback SPA handler compatible with Express 5
app.use((_req, res) => {
  const indexHtml = path.join(staticDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(200).send('BacklogOS is running. Please run npm run build to compile the frontend.');
  }
});

function startServer(portToTry: number) {
  const server = app.listen(portToTry, '0.0.0.0', () => {
    console.log(`BacklogOS server running on http://0.0.0.0:${portToTry}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && portToTry !== 3000) {
      console.warn(`[BacklogOS] Port ${portToTry} in use (e.g. Nginx proxy). Falling back to port 3000...`);
      startServer(3000);
    } else {
      console.error('[BacklogOS] Server listen error:', err);
    }
  });

  return server;
}

startServer(targetPort);


