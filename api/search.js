import { searchProducts } from './lib/serper.js';

/**
 * GET /api/search?q=lavender+vent+air+freshener
 *
 * DAY 1 SCOPE (Feature 1 only): calls Serper.dev live and returns raw
 * product candidates. No database, no AI checks, no fallback yet —
 * those are separate commits/features, added on Day 2:
 *   - Feature 2: save to Supabase + offline/saved fallback
 *   - Feature 3: AI category check
 *   - Feature 4: AI genuineness check
 * This file will be edited (not replaced) as each of those lands, so the
 * git history shows the feature being built up piece by piece.
 */
export default async function handler(req, res) {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await searchProducts(query);
    return res.status(200).json({
      query,
      source: 'live',
      count: results.length,
      results,
    });
  } catch (err) {
    console.error('[search] Serper call failed:', err.message);
    // Day 1: no fallback yet, so a failure here is just an error response.
    // Day 2 will replace this catch block with the saved/offline fallback.
    return res.status(502).json({ error: 'Live search failed', detail: err.message });
  }
}
