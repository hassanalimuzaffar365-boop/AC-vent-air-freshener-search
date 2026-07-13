import { searchProducts } from './lib/serper.js';
import { getFreshCache, getAnyCache, saveResultsToCache } from './lib/cache.js';
import { checkCategoryBatch, checkGenuinenessBatch } from './lib/gemini.js';

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

    let categoryResults;
    try {
      categoryResults = await checkCategoryBatch(rawResults);
    } catch (err) {
      console.error('[search] Gemini category check failed:', err.message);
      return res.status(502).json({ error: 'AI category check failed', detail: err.message });
    }

    const withCategory = rawResults.map((product, i) => ({
      ...product,
      is_vent_freshener: categoryResults[i].is_vent_freshener,
      category_confidence: categoryResults[i].category_confidence,
    }));

    const ventFreshenersOnly = withCategory.filter((p) => p.is_vent_freshener);

    let genuinenessResults;
    try {
      genuinenessResults = await checkGenuinenessBatch(ventFreshenersOnly);
    } catch (err) {
      console.error('[search] Gemini genuineness check failed:', err.message);
      return res.status(502).json({ error: 'AI genuineness check failed', detail: err.message });
    }

    const withGenuineness = ventFreshenersOnly.map((product, i) => ({
      ...product,
      genuine_score: genuinenessResults[i].genuine_score,
      genuine_reason: genuinenessResults[i].genuine_reason,
    }));

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