import { json } from '@remix-run/node';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MODEL = process.env.OPENAI_SUGGEST_MODEL || 'gpt-4.1-mini';

function getOpenAiKey() {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

/* ─── Public loader (OPTIONS preflight) ─── */
export const loader = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  return json({ message: 'Use POST' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
};

/* ─── Public action — no Shopify auth needed ─── */
export const action = async ({ request }) => {
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  const key = getOpenAiKey();
  if (!key) {
    return json({ success: false, error: 'OpenAI API key not configured' }, { status: 500, headers: CORS });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const selectedProducts = Array.isArray(body.selectedProducts) ? body.selectedProducts : [];
  const availableProducts = Array.isArray(body.availableProducts) ? body.availableProducts : [];
  const maxProducts = parseInt(body.maxProducts, 10) || 5;
  const currentCount = parseInt(body.currentCount, 10) || selectedProducts.length;

  if (!availableProducts.length) {
    return json({ success: false, error: 'No available products' }, { status: 400, headers: CORS });
  }

  // Filter out already-selected products from the available list
  const selectedIds = new Set(
    selectedProducts.map((p) => String(p.id || p.handle || '').toLowerCase())
  );
  const candidates = availableProducts.filter(
    (p) => !selectedIds.has(String(p.id || '').toLowerCase()) &&
            !selectedIds.has(String(p.handle || '').toLowerCase())
  );

  if (!candidates.length) {
    return json({ success: false, error: 'All products already selected' }, { status: 200, headers: CORS });
  }

  const remaining = maxProducts - currentCount;
  const selectedTitles = selectedProducts.map((p) => p.title).filter(Boolean).join(', ');
  const candidateList = candidates
    .map((p, i) => `${i + 1}. handle="${p.handle}" title="${p.title}"`)
    .join('\n');

  const systemPrompt =
    'You are a product bundling expert for an e-commerce store. ' +
    'Your job is to recommend the single best next product to add to a combo bundle. ' +
    'Return ONLY valid JSON: {"handle":"<chosen_handle>"}. No explanation, no markdown.';

  const userPrompt = [
    selectedTitles
      ? `Customer already has in their combo: ${selectedTitles}.`
      : 'Customer is starting a new combo.',
    `They need ${remaining} more product${remaining !== 1 ? 's' : ''} to complete the combo (max ${maxProducts} total).`,
    'Choose the ONE product below that best complements their selection:',
    candidateList,
    'Return ONLY: {"handle":"<chosen_handle>"}',
  ].join('\n');

  try {
    const aiRes = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_output_tokens: 40,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
          { role: 'user',   content: [{ type: 'input_text', text: userPrompt }] },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('[AI Recommend] OpenAI error:', errText);
      return json({ success: false, error: 'OpenAI request failed' }, { status: 502, headers: CORS });
    }

    const aiJson = await aiRes.json();
    const rawText = aiJson?.output?.[0]?.content?.[0]?.text || '';

    let chosenHandle = '';
    try {
      const parsed = JSON.parse(rawText.trim());
      chosenHandle = String(parsed.handle || '').trim();
    } catch {
      // Try extracting handle directly
      const match = rawText.match(/"handle"\s*:\s*"([^"]+)"/);
      if (match) chosenHandle = match[1].trim();
    }

    if (!chosenHandle) {
      return json({ success: false, error: 'AI did not return a valid handle' }, { status: 200, headers: CORS });
    }

    // Find the full product object from candidates
    const recommended = candidates.find(
      (p) => String(p.handle || '').toLowerCase() === chosenHandle.toLowerCase()
    );

    if (!recommended) {
      return json({ success: false, error: `Recommended handle "${chosenHandle}" not in candidates` }, { status: 200, headers: CORS });
    }

    return json({ success: true, recommended }, { headers: CORS });
  } catch (err) {
    console.error('[AI Recommend] Error:', err);
    return json({ success: false, error: err.message }, { status: 500, headers: CORS });
  }
};
