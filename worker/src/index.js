const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const FALLBACK_HTML = "<p>I'm having trouble reaching the AI service right now. I can still help with tour questions and general information.</p>";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      CORS_HEADERS
    ),
  });
}

function buildSystemPrompt(policyContext) {
  return [
    "You are the Atlantic Coast Tours assistant, a customer support chatbot for a tour company operating along Ireland's Wild Atlantic Way. Your primary role is to help customers find tours, learn about pricing, understand booking policies, and explore the west coast of Ireland.",
    "When the user's question is covered by the company information or tour database provided below, answer from that data. Quote specific prices, durations, meeting points, and special offers verbatim where they exist.",
    "When the user's question is NOT covered by the data, still answer helpfully using your general knowledge. You can answer questions about Irish tourism, travel tips, the Wild Atlantic Way region, Irish history, culture, food, weather, general travel advice, and other non-tour topics. Be helpful and informative — do not redirect to contacts unless the user specifically asks for a booking or the question truly requires real-time information you cannot provide.",
    "Important notes about pricing in the tour database: ACT017 (Aran Islands Sunset Boat Cruise) has a price of EUR 4,870,233 and ACT021 (Wild Atlantic Way Coach & Cliffs Day) has a price of EUR 999,999. Do NOT automatically correct these prices or pretend they are normal. If the user asks about them directly, confirm the pricing looks odd, then suggest they confirm with the company by calling +353 86 229 3331 or emailing info@atlanticcoasttours.ie.",
    "Weather data from Open-Meteo is provided in the context when available. Use it to give personalised packing and outfit recommendations based on the forecast and the tour category (cliff walk, kayak, cycle, boat, food tour, outdoor activity). For example: a rainy cliff walk needs waterproofs and good shoes; a sunny kayak trip needs sunscreen, a change of clothes and a waterproof bag. Be specific and practical.",
    "Tone: friendly, professional, enthusiastic about Irish travel. UK/Irish English. No exclamation marks. 2-5 sentences per turn. Bold the most important information using **double asterisks**.",
    "PERSONA MODE: When the context includes a PERSONA block at the top, you MUST adopt that persona exactly as described. The persona overrides the default tone. When no PERSONA block is present, use the default professional tone.",
    "Contact details: phone +353 86 229 3331, email info@atlanticcoasttours.ie, address Knockbeg, Collooney, Co. Sligo, F91 YA47, Ireland.",
    "Hard constraints: never invent tour information that is not in the provided database. never claim to have taken action. never use emoji. never begin with 'I'.",
    "",
    "Company and tour information (use this as the source of truth):",
    policyContext || ''
  ].join('\n\n');
}

function buildPayload(userInput, history, systemPrompt) {
  const contents = [];
  if (Array.isArray(history)) {
    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      if (!turn || !turn.role || !turn.text) continue;
      contents.push({
        role: turn.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(turn.text) }]
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: String(userInput) }]
  });

  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };
}

function markdownToHtml(text) {
  if (!text) return '';
  let html = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.split(/\n{2,}/).map(function (p) {
    p = p.replace(/\n/g, '<br>');
    return '<p>' + p + '</p>';
  }).join('');
  return html;
}

async function callGemini(apiKey, payload) {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error('Gemini HTTP ' + response.status + ': ' + errText.substring(0, 200));
  }

  const data = await response.json();
  const candidate = data && data.candidates && data.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const text = parts && parts.length && parts[0] && parts[0].text;
  if (!text) throw new Error('Gemini returned no text');
  return text;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const hasKey = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0);
      return jsonResponse({
        ok: true,
        service: 'act-chatbot-proxy',
        gemini_configured: hasKey,
        model: 'gemini-2.5-flash'
      });
    }

    if (url.pathname !== '/api/chat') {
      return jsonResponse({ error: 'not_found' }, 404);
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: 'server_misconfigured', detail: 'GEMINI_API_KEY not set' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }

    const message = (body && body.message || '').toString().trim();
    const history = body && body.history;
    const policyContext = body && body.policyContext;

    if (!message) {
      return jsonResponse({ error: 'missing_message' }, 400);
    }
    if (message.length > 2000) {
      return jsonResponse({ error: 'message_too_long', limit: 2000 }, 400);
    }
    if (policyContext && policyContext.length > 50000) {
      return jsonResponse({ error: 'policy_too_long', limit: 50000 }, 400);
    }

    try {
      const systemPrompt = buildSystemPrompt(policyContext);
      const payload = buildPayload(message, history, systemPrompt);
      const text = await callGemini(env.GEMINI_API_KEY, payload);
      const html = markdownToHtml(text);
      return jsonResponse({ reply: html, ok: true });
    } catch (e) {
      return jsonResponse({
        reply: FALLBACK_HTML,
        ok: false,
        error: 'gemini_error',
        detail: String(e && e.message || e).substring(0, 300)
      }, 200);
    }
  }
};
