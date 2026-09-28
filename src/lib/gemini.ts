import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

let aiInstance: GoogleGenAI | null = null;

function isValidApiKey(key?: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 25) return false;
  if (trimmed.startsWith('MY_') || trimmed.startsWith('YOUR_') || trimmed.startsWith('TODO') || trimmed === 'MY_GEMINI_API_KEY') {
    return false;
  }
  return true;
}

function ensureApiKeyLoaded(): string | undefined {
  if (isValidApiKey(process.env.GEMINI_API_KEY)) {
    return process.env.GEMINI_API_KEY;
  }

  const candidates = [
    '/app/.dev.env.json',
    path.resolve(process.cwd(), '.dev.env.json'),
    path.resolve(process.cwd(), '../.dev.env.json'),
    path.resolve(process.cwd(), '../../.dev.env.json'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (isValidApiKey(parsed.GEMINI_API_KEY)) {
          process.env.GEMINI_API_KEY = parsed.GEMINI_API_KEY;
          aiInstance = null; // reset any previous instance created with bad placeholder
          return parsed.GEMINI_API_KEY;
        }
      }
    } catch {
      // Ignore
    }
  }

  return process.env.GEMINI_API_KEY;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = ensureApiKeyLoaded();
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}
