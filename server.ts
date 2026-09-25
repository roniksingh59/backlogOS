import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { apiRouter } from './src/api.ts';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', apiRouter);

// Serve static frontend build
const staticDist = path.resolve(process.cwd(), 'artifacts/backlogos/dist');
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

app.listen(port, '0.0.0.0', () => {
  console.log(`BacklogOS server running on http://0.0.0.0:${port}`);
});

