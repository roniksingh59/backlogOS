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

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        }
      }
    }
  } catch {}
  return result;
}

function ensureApiKeyLoaded(): string | undefined {
  // 1. Direct environment variable checks
  const directKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (isValidApiKey(directKey)) {
    process.env.GEMINI_API_KEY = directKey;
    return directKey;
  }

  // 2. Candidate .dev.env.json files
  const jsonCandidates = [
    '/app/.dev.env.json',
    path.resolve(process.cwd(), '.dev.env.json'),
    path.resolve(process.cwd(), '../.dev.env.json'),
    path.resolve(process.cwd(), '../../.dev.env.json'),
  ];

  for (const file of jsonCandidates) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const cand = parsed.GEMINI_API_KEY || parsed.API_KEY || parsed.GOOGLE_API_KEY;
        if (isValidApiKey(cand)) {
          process.env.GEMINI_API_KEY = cand;
          aiInstance = null;
          return cand;
        }
      }
    } catch {}
  }

  // 3. Candidate .env files
  const envCandidates = [
    '/app/.env',
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  for (const file of envCandidates) {
    const parsed = parseEnvFile(file);
    const cand = parsed.GEMINI_API_KEY || parsed.API_KEY || parsed.GOOGLE_API_KEY;
    if (isValidApiKey(cand)) {
      process.env.GEMINI_API_KEY = cand;
      aiInstance = null;
      return cand;
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
