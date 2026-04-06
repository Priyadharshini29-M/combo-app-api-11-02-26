import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import fs from 'fs';
import path from 'path';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_SUGGEST_MODEL || 'gpt-4.1-mini';

function readEnvKeyFromFile(keyName) {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex <= 0) continue;

        const key = line.slice(0, eqIndex).trim();
        if (key !== keyName) continue;

        return line
          .slice(eqIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
      }
    } catch (error) {
      console.warn(
        '[Suggestions API] Failed reading env file:',
        filePath,
        error
      );
    }
  }

  return '';
}

function getOpenAiKey() {
  const direct = String(process.env.OPENAI_API_KEY || '').trim();
  if (direct) return direct;
  return readEnvKeyFromFile('OPENAI_API_KEY');
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(title) {
  const normalized = normalizeText(title).replace(/^"+|"+$/g, '');
  if (normalized.length <= 60) return normalized;

  const truncated = normalized.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function cleanDescription(description) {
  const normalized = normalizeText(description)
    .replace(/^"+|"+$/g, '')
    .replace(/\n+/g, ' ');

  let sentences = splitSentences(normalized);
  if (sentences.length === 0) {
    return 'Build a personalized bundle from this curated collection. Find the best combinations to match your needs and style.';
  }

  if (sentences.length > 4) {
    sentences = sentences.slice(0, 4);
  }

  if (sentences.length < 2) {
    sentences.push(
      'Explore curated picks designed to boost value in every combo.'
    );
  }

  return sentences.join(' ');
}

function cleanSubtitle(subtitle) {
  const normalized = normalizeText(subtitle).replace(/^"+|"+$/g, '');
  if (normalized.length <= 80) return normalized;
  return normalized.slice(0, 80).trim();
}

function extractResponseText(apiResponse) {
  if (typeof apiResponse?.output_text === 'string' && apiResponse.output_text) {
    return apiResponse.output_text;
  }

  const output = Array.isArray(apiResponse?.output) ? apiResponse.output : [];
  const textParts = [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        textParts.push(content.text.trim());
      }
    }
  }

  return textParts.join('\n').trim();
}

function parseJsonObject(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildContextHints(context) {
  if (!context || typeof context !== 'object') {
    return '';
  }

  const hints = [];
  const layout = normalizeText(context.layout);
  const templateTitle = normalizeText(context.templateTitle);
  const collectionHandle = normalizeText(context.collectionHandle);
  const selectedCollections = Array.isArray(context.selectedCollections)
    ? context.selectedCollections.filter(Boolean).slice(0, 8)
    : [];

  if (layout) hints.push(`Layout: ${layout}`);
  if (templateTitle) hints.push(`Template title: ${templateTitle}`);
  if (collectionHandle)
    hints.push(`Primary collection handle: ${collectionHandle}`);
  if (selectedCollections.length > 0) {
    hints.push(`Selected collections: ${selectedCollections.join(', ')}`);
  }

  return hints.join('\n');
}

function buildAnchorTerms(values = []) {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'your',
    'you',
    'our',
    'are',
    'was',
    'were',
    'have',
    'has',
    'into',
    'more',
    'best',
    'one',
    'two',
    'all',
    'new',
    'select',
  ]);

  const tokens = values
    .map((value) => normalizeText(value).toLowerCase())
    .join(' ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  return [...new Set(tokens)].slice(0, 8);
}

function isSameText(a, b) {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}

function containsAnyTerm(text, terms = []) {
  const normalized = normalizeText(text).toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function ensureRelevantAlternative({
  current,
  candidate,
  type,
  maxLength,
  fallbackContext,
}) {
  const currentText = normalizeText(current);
  let nextText = normalizeText(candidate);
  const currentTerms = buildAnchorTerms([currentText]);

  if (!nextText) {
    nextText = fallbackContext || currentText;
  }

  if (currentText && isSameText(nextText, currentText)) {
    if (type === 'description') {
      nextText = `${currentText} Explore more curated options in this collection.`;
    } else if (type === 'subtitle') {
      nextText = `Explore ${currentText}`;
    } else {
      nextText = `Curated ${currentText}`;
    }
  }

  if (currentTerms.length > 0 && !containsAnyTerm(nextText, currentTerms)) {
    const anchor = currentTerms[0];
    if (type === 'description') {
      nextText = `${nextText} Ideal for ${anchor}-focused shoppers.`;
    } else {
      nextText = `${nextText} ${anchor}`;
    }
  }

  if (maxLength && nextText.length > maxLength && type !== 'description') {
    const sliced = nextText.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(' ');
    nextText = (lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced).trim();
  }

  return nextText;
}

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    );
  }

  const openAiKey = getOpenAiKey();
  if (!openAiKey) {
    return json(
      {
        success: false,
        error: 'OPENAI_API_KEY is not configured on the server',
      },
      { status: 500 }
    );
  }

  const { session } = await authenticate.admin(request);
  const shop = session?.shop || 'unknown-shop';

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const allowedTargets = new Set(['title', 'description', 'both', 'steps', 'collection_suggest']);
  const target = String(body?.target || '').trim();

  if (!allowedTargets.has(target)) {
    return json(
      {
        success: false,
        error: 'Invalid target. Expected title, description, both, steps, or collection_suggest.',
      },
      { status: 400 }
    );
  }

  if (target === 'collection_suggest') {
    const availableCollections = Array.isArray(body?.availableCollections)
      ? body.availableCollections.filter((c) => c && c.handle && c.title)
      : [];
    const selectedHandles = Array.isArray(body?.selectedHandles)
      ? body.selectedHandles.filter(Boolean)
      : [];
    const templateTitle = normalizeText(body?.templateTitle || '');
    const layout = normalizeText(body?.layout || '');

    if (availableCollections.length === 0) {
      return json(
        { success: false, error: 'No available collections provided.' },
        { status: 400 }
      );
    }

    const unselected = availableCollections.filter(
      (c) => !selectedHandles.includes(c.handle)
    );

    if (unselected.length === 0) {
      return json(
        { success: false, error: 'All collections are already selected.' },
        { status: 400 }
      );
    }

    const selectedTitles = availableCollections
      .filter((c) => selectedHandles.includes(c.handle))
      .map((c) => c.title);

    const collectionList = unselected
      .map((c, i) => `${i + 1}. handle="${c.handle}" title="${c.title}"`)
      .join('\n');

    const collSysPrompt = [
      'You are a Shopify merchandising expert helping build product combo/bundle templates.',
      'You will be given a list of available collections and some already-selected collections.',
      'Return ONLY strict JSON with a single key "handle" containing the handle string of the best next collection to add.',
      'Choose the collection that best complements the already-selected ones based on typical product pairing and upsell logic.',
      'If no collections are selected yet, choose the most versatile starting collection.',
    ].join(' ');

    const collUserPrompt = [
      `Template title: ${templateTitle || '(untitled)'}`,
      `Layout: ${layout || 'standard'}`,
      `Already-selected collections: ${selectedTitles.length ? selectedTitles.join(', ') : '(none)'}`,
      'Available collections to choose from:',
      collectionList,
      'Return ONLY: {"handle":"<chosen_handle>"}',
    ].join('\n');

    let collRes;
    try {
      collRes = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.7,
          max_output_tokens: 60,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: collSysPrompt }] },
            { role: 'user', content: [{ type: 'input_text', text: collUserPrompt }] },
          ],
        }),
      });
    } catch (error) {
      return json({ success: false, error: 'Failed to reach AI provider' }, { status: 502 });
    }

    let collJson;
    try { collJson = await collRes.json(); } catch {
      return json({ success: false, error: 'AI provider returned a non-JSON response' }, { status: 502 });
    }

    if (!collRes.ok) {
      return json(
        { success: false, error: `AI provider request failed (${collRes.status})` },
        { status: 502 }
      );
    }

    const collRaw = extractResponseText(collJson);
    const collParsed = parseJsonObject(collRaw);
    const suggestedHandle = normalizeText(collParsed?.handle || '');

    const matched = unselected.find((c) => c.handle === suggestedHandle);
    if (!matched) {
      return json(
        { success: false, error: 'AI suggested an unrecognised collection handle.' },
        { status: 502 }
      );
    }

    return json({ success: true, data: { handle: matched.handle, title: matched.title } });
  }

  const stepItems = Array.isArray(body?.steps)
    ? body.steps
        .map((item) => ({
          step: Number(item?.step || 0),
          collectionHandle: normalizeText(item?.collectionHandle),
          collectionTitle: normalizeText(item?.collectionTitle),
          currentTitle: normalizeText(item?.currentTitle),
          currentSubtitle: normalizeText(item?.currentSubtitle),
        }))
        .filter((item) => Number.isInteger(item.step) && item.step > 0)
    : [];
  const requestedField = normalizeText(
    body?.requestedField || 'both'
  ).toLowerCase();

  if (target === 'steps' && stepItems.length === 0) {
    return json(
      {
        success: false,
        error: 'No step entries provided for bulk title/subtitle generation.',
      },
      { status: 400 }
    );
  }

  const currentTitle = normalizeText(body?.currentTitle);
  const currentDescription = normalizeText(body?.currentDescription);
  const nonce = normalizeText(body?.nonce || Date.now());
  const contextHints = buildContextHints(body?.context);
  const anchorTerms = buildAnchorTerms([
    currentTitle,
    currentDescription,
    ...stepItems.map((item) => item.currentTitle),
    ...stepItems.map((item) => item.currentSubtitle),
    ...stepItems.map((item) => item.collectionTitle),
  ]);
  const shouldGenerateBoth =
    target !== 'steps' && !currentTitle && !currentDescription;
  const effectiveTarget =
    target === 'steps' ? 'steps' : shouldGenerateBoth ? 'both' : target;

  const systemPrompt =
    effectiveTarget === 'steps'
      ? [
          'You are a senior Shopify conversion copywriter and merchandising strategist.',
          'Return ONLY strict JSON with key steps.',
          'steps must be an array of objects: {"step":number,"title":string,"subtitle":string}.',
          'Title constraints: max 40 characters, concise and scannable.',
          'Subtitle constraints: max 80 characters, helpful, action-oriented, no markdown.',
          'If current title/subtitle exists, rewrite as a clear alternative preserving the same intent and key nouns.',
          'Each generated step copy must stay relevant to that step collection title/handle context.',
          'Always produce fresh variations and avoid repeated phrasing across steps.',
        ].join(' ')
      : [
          'You are a senior Shopify conversion copywriter and SEO specialist.',
          'Return ONLY strict JSON with keys title and description.',
          'Title constraints: max 60 characters, concise, keyword-rich, human, no hashtags, no markdown.',
          'Description constraints: 2 to 4 sentences, persuasive, clear, collection-focused, no markdown or bullet points.',
          'If current text exists, produce a genuine alternative that preserves core meaning and improves clarity/conversion intent.',
          'Do not repeat the exact input text.',
          'Always produce a fresh variation for each request. Avoid repeating earlier phrasing.',
        ].join(' ');

  const userPrompt =
    effectiveTarget === 'steps'
      ? [
          `Shop domain: ${shop}`,
          `Regeneration nonce: ${nonce}`,
          'Generation target: steps',
          contextHints
            ? `Context hints:\n${contextHints}`
            : 'Context hints: combo products and bundle collections',
          `Requested field focus: ${requestedField}`,
          `Anchor terms to preserve when relevant: ${
            anchorTerms.length ? anchorTerms.join(', ') : '(none)'
          }`,
          'Step entries:',
          JSON.stringify(stepItems),
          'Output format example:',
          '{"steps":[{"step":1,"title":"Choose Your Base","subtitle":"Pick one starter from this collection"}]}',
        ].join('\n')
      : [
          `Shop domain: ${shop}`,
          `Regeneration nonce: ${nonce}`,
          `Generation target: ${effectiveTarget}`,
          `Mode: ${shouldGenerateBoth ? 'empty_fields_generate_new' : 'improve_existing_copy'}`,
          contextHints
            ? `Context hints:\n${contextHints}`
            : 'Context hints: combo products and bundle collections',
          `Anchor terms to preserve when relevant: ${
            anchorTerms.length ? anchorTerms.join(', ') : '(none)'
          }`,
          `Current title: ${currentTitle || '(empty)'}`,
          `Current description: ${currentDescription || '(empty)'}`,
          'Output format example:',
          '{"title":"...","description":"..."}',
        ].join('\n');

  let openAiResponse;
  try {
    openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.9,
        max_output_tokens: 260,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
      }),
    });
  } catch (error) {
    console.error('[Suggestions API] Network error:', error);
    return json(
      { success: false, error: 'Failed to reach AI provider' },
      { status: 502 }
    );
  }

  let providerJson;
  try {
    providerJson = await openAiResponse.json();
  } catch {
    return json(
      { success: false, error: 'AI provider returned a non-JSON response' },
      { status: 502 }
    );
  }

  if (!openAiResponse.ok) {
    console.error('[Suggestions API] Provider error:', providerJson);

    const providerMessage =
      providerJson?.error?.message ||
      providerJson?.message ||
      'AI provider request failed';

    if (openAiResponse.status === 429) {
      return json(
        {
          success: false,
          error:
            'OpenAI rate limit or quota reached. Please check billing/quota and try again shortly.',
          providerMessage,
        },
        { status: 429 }
      );
    }

    return json(
      {
        success: false,
        error: `AI provider request failed (${openAiResponse.status})`,
        providerMessage,
      },
      { status: 502 }
    );
  }

  const rawText = extractResponseText(providerJson);
  const parsed = parseJsonObject(rawText);

  if (!parsed || typeof parsed !== 'object') {
    return json(
      { success: false, error: 'AI response format was invalid' },
      { status: 502 }
    );
  }

  if (effectiveTarget === 'steps') {
    const parsedSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
    const cleanedSteps = stepItems
      .map((baseItem) => {
        const matched = parsedSteps.find(
          (candidate) => Number(candidate?.step) === baseItem.step
        );

        const preferredTitle =
          requestedField === 'subtitle'
            ? baseItem.currentTitle || matched?.title
            : matched?.title;
        const preferredSubtitle =
          requestedField === 'title'
            ? baseItem.currentSubtitle || matched?.subtitle
            : matched?.subtitle;

        const titleCandidate =
          normalizeText(preferredTitle) ||
          baseItem.currentTitle ||
          baseItem.collectionTitle ||
          `Step ${baseItem.step}`;

        const subtitleCandidate =
          normalizeText(preferredSubtitle) ||
          baseItem.currentSubtitle ||
          `Choose items from ${baseItem.collectionTitle || 'this collection'}.`;

        const relatedTitle = ensureRelevantAlternative({
          current: baseItem.currentTitle,
          candidate: titleCandidate,
          type: 'title',
          maxLength: 40,
          fallbackContext: baseItem.collectionTitle || `Step ${baseItem.step}`,
        });

        const relatedSubtitle = ensureRelevantAlternative({
          current: baseItem.currentSubtitle,
          candidate: subtitleCandidate,
          type: 'subtitle',
          maxLength: 80,
          fallbackContext: `Choose items from ${
            baseItem.collectionTitle || 'this collection'
          }.`,
        });

        return {
          step: baseItem.step,
          title: cleanTitle(relatedTitle),
          subtitle: cleanSubtitle(relatedSubtitle),
        };
      })
      .filter((item) => item.title && item.subtitle);

    if (cleanedSteps.length === 0) {
      return json(
        {
          success: false,
          error: 'AI response did not contain valid step copy.',
        },
        { status: 502 }
      );
    }

    console.log('[Suggestions API] Generated step suggestions', {
      shop,
      target: effectiveTarget,
      count: cleanedSteps.length,
    });

    if (requestedField === 'title') {
      const unchanged = cleanedSteps.every((item) => {
        const current =
          stepItems.find((stepItem) => stepItem.step === item.step)
            ?.currentTitle || '';
        return current ? isSameText(item.title, current) : false;
      });
      if (unchanged) {
        return json(
          {
            success: false,
            error:
              'AI returned the same title text. Try again for a stronger alternative.',
          },
          { status: 409 }
        );
      }
    }

    if (requestedField === 'subtitle') {
      const unchanged = cleanedSteps.every((item) => {
        const current =
          stepItems.find((stepItem) => stepItem.step === item.step)
            ?.currentSubtitle || '';
        return current ? isSameText(item.subtitle, current) : false;
      });
      if (unchanged) {
        return json(
          {
            success: false,
            error:
              'AI returned the same subtitle text. Try again for a stronger alternative.',
          },
          { status: 409 }
        );
      }
    }

    return json({
      success: true,
      data: {
        steps: cleanedSteps,
        variationNonce: nonce,
      },
    });
  }

  const nextTitleCandidate =
    parsed.title || (effectiveTarget === 'description' ? currentTitle : '');
  const nextDescriptionCandidate =
    parsed.description ||
    (effectiveTarget === 'title' ? currentDescription : '');

  const relatedTitleCandidate = ensureRelevantAlternative({
    current: currentTitle,
    candidate: nextTitleCandidate,
    type: 'title',
    maxLength: 60,
    fallbackContext: currentTitle || 'Build Your Combo',
  });

  const relatedDescriptionCandidate = ensureRelevantAlternative({
    current: currentDescription,
    candidate: nextDescriptionCandidate,
    type: 'description',
    fallbackContext:
      'Build a personalized bundle from this curated collection. Discover combinations designed for better value and fit.',
  });

  const nextTitle = cleanTitle(relatedTitleCandidate);
  const nextDescription = cleanDescription(relatedDescriptionCandidate);

  if (!nextTitle || !nextDescription) {
    return json(
      { success: false, error: 'AI response did not contain valid content' },
      { status: 502 }
    );
  }

  if (
    effectiveTarget === 'title' &&
    currentTitle &&
    isSameText(nextTitle, currentTitle)
  ) {
    return json(
      {
        success: false,
        error:
          'AI returned the same title text. Try again for a stronger alternative.',
      },
      { status: 409 }
    );
  }

  if (
    effectiveTarget === 'description' &&
    currentDescription &&
    isSameText(nextDescription, currentDescription)
  ) {
    return json(
      {
        success: false,
        error:
          'AI returned the same description text. Try again for a stronger alternative.',
      },
      { status: 409 }
    );
  }

  console.log('[Suggestions API] Generated suggestion', {
    shop,
    target: effectiveTarget,
    titleLength: nextTitle.length,
    sentenceCount: splitSentences(nextDescription).length,
  });

  return json({
    success: true,
    data: {
      title: nextTitle,
      description: nextDescription,
      variationNonce: nonce,
    },
  });
};
