import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

if (!projectId) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      projectId = parsed.projectId;
    }
  } catch (err) {
    console.warn('Warning: Could not read firebase-applet-config.json:', err);
  }
}

if (!getApps().length) {
  initializeApp({
    projectId: projectId || 'total-essence-1lkcn',
  });
}

export const adminAuth = getAuth();

