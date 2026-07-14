/**
 * SRS Feature 3: "Use AI to check: is this a vent freshener or not?
 * Remove the ones that are not."
 *
 * SRS Section 8, Question 1: "Here is a product title and description.
 * Is this a car AC vent-mount air freshener? Answer yes or no, and how
 * sure you are."
 *
 * Products are sent in one batch per call (not one at a time) to save
 * on free-tier daily request limits, per Section 8's guidance.
 */

// Configurable so the model can be swapped without a code change if
// Google renames/retires one (this has already happened twice during
// development - 2.5-flash was retired, then 3.5-flash turned out to
// have a very low free daily quota). Set GEMINI_MODEL in .env to override.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Wraps a Gemini API call with automatic retries for transient failures
 * (503 "high demand" is common on the free tier). Retries up to 2 extra
 * times with a short delay before giving up.
 */
async function fetchGeminiWithRetry(body, maxAttempts = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) return response;

    const errText = await response.text();
    lastError = new Error(`Gemini API error: ${response.status} ${errText}`);

    // Only retry on transient server-side errors, not on bad requests (4xx).
    const isRetryable = response.status === 503 || response.status === 429;
    if (!isRetryable || attempt === maxAttempts) throw lastError;

    console.warn(
      `[gemini] Attempt ${attempt} failed (${response.status}), retrying in ${attempt}s...`
    );
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }

  throw lastError;
}

/**
 * @param {Array<{name: string}>} products
 * @returns {Promise<Array<{is_vent_freshener: boolean, category_confidence: number}>>}
 *   Same length and order as the input array.
 */
export async function checkCategoryBatch(products) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  if (products.length === 0) return [];

  const productList = products
    .map((p, i) => `${i}. "${p.name}"`)
    .join('\n');

  const prompt = `You are checking product titles for an online search tool that only
shows car AC vent-mount air fresheners (the small clip that attaches
directly to a car's air conditioning vent).

For each numbered product title below, decide: is this really a
car AC vent-mount air freshener? Answer "no" for anything else,
including spray air fresheners, gel/jar air fresheners, hanging
paper air fresheners, room diffusers, or unrelated products.

Products:
${productList}

Respond with ONLY a JSON array (no markdown, no extra text), one object
per product in the same order, like this:
[{"index": 0, "is_vent_freshener": true, "confidence": 0.95}, ...]

"confidence" is a number from 0 to 1 representing how sure you are.`;

  const response = await fetchGeminiWithRetry({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
  });

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned no usable content for category check');

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseErr) {
    console.error('[gemini] Failed to parse category check response. Raw text was:', rawText);
    throw new Error(`Gemini returned malformed JSON: ${parseErr.message}`);
  }

  // Map back to the same order as the input, defaulting to "not a vent
  // freshener, low confidence" for any product Gemini didn't return an
  // answer for (fail safe: when unsure, exclude rather than include).
  return products.map((_, i) => {
    const match = parsed.find((entry) => entry.index === i);
    return {
      is_vent_freshener: match?.is_vent_freshener ?? false,
      category_confidence: match?.confidence ?? 0,
    };
  });
}

/**
 * SRS Feature 4: "Use AI to check: does this listing look real or fake?
 * Show a badge for it."
 *
 * SRS Section 8, Question 2: "Here is a product's price, rating, and
 * number of reviews. Does this look like a genuine, trustworthy listing,
 * or does it look fake/spam? Give a score from 0 to 100 and a short reason."
 *
 * @param {Array<{name: string, price: number, rating: number, review_count: number}>} products
 * @returns {Promise<Array<{genuine_score: number, genuine_reason: string}>>}
 *   Same length and order as the input array.
 */
export async function checkGenuinenessBatch(products) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  if (products.length === 0) return [];

  const productList = products
    .map(
      (p, i) =>
        `${i}. "${p.name}" — price: $${p.price ?? 'unknown'}, rating: ${
          p.rating ?? 'no rating'
        }, review count: ${p.review_count ?? 0}`
    )
    .join('\n');

  const prompt = `You are checking online product listings for signs of being fake,
spam, or untrustworthy — using only price, rating, and review count
(no review text). Signs of a fake/low-trust listing include: a rating
with zero or very few reviews, prices that are suspiciously low or
high for the product type, or round/generic numbers that look padded.

Products:
${productList}

Respond with ONLY a JSON array (no markdown, no extra text), one object
per product in the same order, like this:
[{"index": 0, "genuine_score": 85, "reason": "Established price point with a large, consistent review count"}, ...]

"genuine_score" is an integer from 0 (looks fake/spam) to 100 (looks
genuine and trustworthy). "reason" is a short (under 15 words) explanation.`;

  const response = await fetchGeminiWithRetry({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
  });

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned no usable content for genuineness check');

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseErr) {
    console.error('[gemini] Failed to parse genuineness check response. Raw text was:', rawText);
    throw new Error(`Gemini returned malformed JSON: ${parseErr.message}`);
  }

  return products.map((_, i) => {
    const match = parsed.find((entry) => entry.index === i);
    return {
      genuine_score: match?.genuine_score ?? 0,
      genuine_reason: match?.reason ?? 'AI did not return a reason',
    };
  });
}
