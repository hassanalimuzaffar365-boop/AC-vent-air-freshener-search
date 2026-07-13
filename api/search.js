import { searchProducts } from './lib/serper.js';
import { getFreshCache, getAnyCache, saveResultsToCache } from './lib/cache.js';
import { checkCategoryBatch } from './lib/gemini.js';

/**
 * GET /api/search?q=lavender+vent+air+freshener
 *
 * DAY 2 SCOPE (Feature 3 added): after a live search, every candidate
 * is now run through the AI category check (Section 8, Question 1)
 * before being saved/shown. Anything that isn't really a vent-mount
 * freshener gets dropped here.
 *
 * Feature 4 (AI genuineness check) is the next commit - not in this
 * file yet.
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

    // Step 4: AI category check - drop anything that isn't a vent freshener
    let categoryResults;
    try {
      categoryResults = await checkCategoryBatch(rawResults);
    } catch (err) {
      console.error('[search] Gemini category check failed:', err.message);
      // If the AI check itself fails, don't silently show unchecked
      // products - fail safe by returning an error instead.
      return res.status(502).json({
        error: 'AI category check failed',
        detail: err.message,
      });
    }

    const withCategory = rawResults.map((product, i) => ({
      ...product,
      is_vent_freshener: categoryResults[i].is_vent_freshener,
      category_confidence: categoryResults[i].category_confidence,
    }));

    const ventFreshenersOnly = withCategory.filter((p) => p.is_vent_freshener);

    // Step 6: save the results, mark them "live"
    const saved = await saveResultsToCache(query, ventFreshenersOnly, 'live');

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
