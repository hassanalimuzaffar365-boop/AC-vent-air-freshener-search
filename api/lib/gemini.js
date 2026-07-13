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

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

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

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned no usable content for category check');

  const parsed = JSON.parse(rawText);

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

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned no usable content for genuineness check');

  const parsed = JSON.parse(rawText);

  return products.map((_, i) => {
    const match = parsed.find((entry) => entry.index === i);
    return {
      genuine_score: match?.genuine_score ?? 0,
      genuine_reason: match?.reason ?? 'AI did not return a reason',
    };
  });
}