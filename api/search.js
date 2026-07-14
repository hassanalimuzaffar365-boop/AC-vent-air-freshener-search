import { searchProducts } from './lib/serper.js';
import { getFreshCache, getAnyCache, saveResultsToCache } from './lib/cache.js';
import { checkCategoryBatch, checkGenuinenessBatch } from './lib/gemini.js';

/**
 * Falls back to any saved answer for this query, however old. Shared by
 * every failure point in the pipeline (Serper down, Gemini down) so a
 * temporary outage anywhere still shows something instead of an error,
 * per SRS Section 5 step 7 and Section 12's "AI service downtime" risk.
 */
async function respondWithFallbackOrError(res, query, reason, detail) {
  const fallback = await getAnyCache(query);
  if (fallback && fallback.length > 0) {
    return res.status(200).json({
      query,
      source: 'saved',
      count: fallback.length,
      results: fallback,
      note: `Live results unavailable (${reason}); showing the last saved answer.`,
    });
  }
  return res.status(502).json({ error: reason, detail });
}

export default async function handler(req, res) {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const freshCache = await getFreshCache(query);
    if (freshCache && freshCache.length > 0) {
      return res.status(200).json({
        query,
        source: 'saved',
        count: freshCache.length,
        results: freshCache,
      });
    }

    let rawResults;
    try {
      rawResults = await searchProducts(query);
    } catch (err) {
      console.error('[search] Serper call failed, falling back to saved:', err.message);
      return respondWithFallbackOrError(
        res,
        query,
        'Live search failed and no saved results are available for this query yet',
        err.message
      );
    }

    // Feature 3: AI category check
    let categoryResults;
    try {
      categoryResults = await checkCategoryBatch(rawResults);
    } catch (err) {
      console.error('[search] Gemini category check failed, falling back to saved:', err.message);
      return respondWithFallbackOrError(
        res,
        query,
        'AI category check failed and no saved results are available for this query yet',
        err.message
      );
    }

    const withCategory = rawResults.map((product, i) => ({
      ...product,
      is_vent_freshener: categoryResults[i].is_vent_freshener,
      category_confidence: categoryResults[i].category_confidence,
    }));

    const ventFreshenersOnly = withCategory.filter((p) => p.is_vent_freshener);

    // Feature 4: AI genuineness check (only on the products that survived Feature 3)
    let genuinenessResults;
    try {
      genuinenessResults = await checkGenuinenessBatch(ventFreshenersOnly);
    } catch (err) {
      console.error('[search] Gemini genuineness check failed, falling back to saved:', err.message);
      return respondWithFallbackOrError(
        res,
        query,
        'AI genuineness check failed and no saved results are available for this query yet',
        err.message
      );
    }

    const withGenuineness = ventFreshenersOnly.map((product, i) => ({
      ...product,
      genuine_score: genuinenessResults[i].genuine_score,
      genuine_reason: genuinenessResults[i].genuine_reason,
    }));

    // Feature 5: sort by most trustworthy first
    withGenuineness.sort((a, b) => b.genuine_score - a.genuine_score);

    const saved = await saveResultsToCache(query, withGenuineness, 'live');

    return res.status(200).json({
      query,
      source: 'live',
      count: saved.length,
      totalBeforeFiltering: rawResults.length,
      results: saved,
    });
  } catch (err) {
    console.error('[search] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
}