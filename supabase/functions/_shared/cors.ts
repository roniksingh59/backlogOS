const ALLOWED_EXACT_ORIGINS = new Set<string>([
  'https://backlogos.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);

function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_EXACT_ORIGINS.has(origin)) return origin;

  const extra = Deno.env.get('ALLOWED_ORIGINS') || '';
  if (extra) {
    for (const item of extra.split(',')) {
      if (item.trim() === origin) return origin;
    }
  }

  // Allow AI Studio preview Cloud Run origins & Netlify deploy previews over HTTPS
  if (
    /^https:\/\/[a-z0-9-]+\.asia-southeast1\.run\.app$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.a\.run\.app$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+--backlogos\.netlify\.app$/i.test(origin)
  ) {
    return origin;
  }

  return null;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const matchedOrigin = isAllowedOrigin(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  if (matchedOrigin) {
    headers['Access-Control-Allow-Origin'] = matchedOrigin;
  }

  return headers;
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
  }
  return null;
}

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}
