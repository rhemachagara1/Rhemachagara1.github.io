/**
 * StudyOS — Cloudflare Worker API Proxy
 * 
 * HOW TO DEPLOY:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this entire file into the worker editor
 * 3. Click Settings → Variables → Add variable:
 *    Name: ANTHROPIC_API_KEY   Value: sk-ant-...your key...
 * 4. Deploy. Copy the worker URL (e.g. https://studyos.yourname.workers.dev)
 * 5. Paste that URL into index.html where it says: const API_PROXY = '...'
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow POST to /v1/messages
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response('Not found', { status: 404 });
    }

    // Rate limiting — basic check (Cloudflare handles real DDoS)
    const body = await request.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), {
        status: 400, headers: corsHeaders(),
      });
    }

    // Forward to Anthropic
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(parsed),
    });

    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
