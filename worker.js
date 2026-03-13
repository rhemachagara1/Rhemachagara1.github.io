/**
 * StudyOS — Cloudflare Worker
 * Proxies requests to Google Gemini API (free tier)
 */

const GEMINI_API_KEY = "AIzaSyB1MvRh2Bk5UZXJSI3us3ccAq9mB15AJkM";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }

    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders() });
    }

    // Convert Anthropic-style request { system, messages, max_tokens } → Gemini format
    const system   = body.system || '';
    const messages = body.messages || [];

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Prepend system prompt as a user/model exchange so Gemini accepts it
    if (system) {
      contents.unshift({ role: 'user',  parts: [{ text: `[System instructions: ${system}]` }] });
      contents.splice(1, 0, { role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] });
    }

    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 800,
        temperature: 0.7,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_NONE' },
      ]
    };

    try {
      const resp = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      const data = await resp.json();

      if (!resp.ok) {
        return new Response(JSON.stringify({
          error: { message: data.error?.message || `Gemini error ${resp.status}` }
        }), { status: resp.status, headers: corsHeaders() });
      }

      // Return Anthropic-style response so the app code needs zero changes
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return new Response(JSON.stringify({
        content: [{ type: 'text', text }],
        model: 'gemini-1.5-flash',
        role: 'assistant',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });

    } catch (err) {
      return new Response(JSON.stringify({
        error: { message: 'Worker error: ' + err.message }
      }), { status: 500, headers: corsHeaders() });
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
