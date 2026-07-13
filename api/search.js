import { searchProducts } from './lib/serper.js';
import { getFreshCache, getAnyCache, saveResultsToCache } from './lib/cache.js';

/**
 * GET /api/search?q=lavender+vent+air+freshener
 *
 * DAY 2 SCOPE (Feature 2 added): implements SRS Section 5 steps 1-3, 6-7.
 *   - Step 2: check for a recent (<24h) saved answer first, show it immediately
 *   - Step 3: otherwise call Serper.dev live
 *   - Step 6: save the good results, mark them "live"
 *   - Step 7: if Serper fails, fall back to the last saved answer, marked "saved"
 *
 * AI category/genuineness checks (Feature 3, Feature 4 - steps 4-5) are NOT
 * in this file yet — they're the next two commits. Right now every raw
 * Serper result gets saved and returned as-is.
 */
export default async function handler(req, res) {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // Step 2: recent cache check
    const freshCache = await getFreshCache(query);
    if (freshCache && freshCache.length > 0) {
      return res.status(200).json({
        query,
        source: 'saved',
        count: freshCache.length,
        results: freshCache,
      });
    }

    // Step 3: live search
    let rawResults;
    try {
      rawResults = await searchProducts(query);
    } catch (err) {
      console.error('[search] Serper call failed, falling back to saved:', err.message);

      // Step 7: live search failed -> fall back to any saved answer, however old
      const fallback = await getAnyCache(query);
      if (fallback && fallback.length > 0) {
        return res.status(200).json({
          query,
          source: 'saved',
          count: fallback.length,
          results: fallback,
        });
      }

      return res.status(502).json({
        error: 'Live search failed and no saved results are available for this query yet',
        detail: err.message,
      });
    }

    // Step 6: save the results, mark them "live"
    const saved = await saveResultsToCache(query, rawResults, 'live');

    return res.status(200).json({
      query,
      source: 'live',
      count: saved.length,
      results: saved,
    });
  } catch (err) {
    console.error('[search] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Something went wrong', detail: err.message });
  }
}
