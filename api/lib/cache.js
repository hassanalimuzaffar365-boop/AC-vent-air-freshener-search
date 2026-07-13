import { getSupabaseClient } from './supabase.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SRS Section 5, step 2: "do we have a recent saved answer for this
 * search (less than a day old)? If yes, show that immediately."
 * Returns the cached product list if a fresh cache entry exists, else null.
 */
export async function getFreshCache(query) {
  const supabase = getSupabaseClient();

  const { data: cacheEntry, error } = await supabase
    .from('search_cache')
    .select('*')
    .eq('query_text', query)
    .order('last_run_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!cacheEntry) return null;

  const age = Date.now() - new Date(cacheEntry.last_run_at).getTime();
  if (age > ONE_DAY_MS) return null; // exists, but too old to count as "fresh"

  return fetchProductsByIds(cacheEntry.product_ids);
}

/**
 * SRS Section 5, step 7: "If step 3 fails (search API is down...), the
 * app shows the last saved answer instead." No age limit here — any
 * saved answer, however old, is better than showing nothing.
 */
export async function getAnyCache(query) {
  const supabase = getSupabaseClient();

  const { data: cacheEntry, error } = await supabase
    .from('search_cache')
    .select('*')
    .eq('query_text', query)
    .order('last_run_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!cacheEntry) return null;

  return fetchProductsByIds(cacheEntry.product_ids);
}

async function fetchProductsByIds(productIds) {
  if (!productIds || productIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('products').select('*').in('id', productIds);
  if (error) throw error;
  return data;
}

/**
 * SRS Feature 2: "Save every search result to the database with a
 * date/time stamp." Inserts products, then writes a search_cache row
 * pointing at them so this exact query can be looked up again later.
 */
export async function saveResultsToCache(query, products, source) {
  const supabase = getSupabaseClient();

  const { data: insertedProducts, error: insertError } = await supabase
    .from('products')
    .insert(
      products.map((p) => ({
        name: p.name,
        link: p.link,
        source_site: p.source_site,
        price: p.price,
        rating: p.rating,
        review_count: p.review_count,
        photo_url: p.photo_url,
        is_vent_freshener: p.is_vent_freshener ?? null,
        category_confidence: p.category_confidence ?? null,
        genuine_score: p.genuine_score ?? null,
        genuine_reason: p.genuine_reason ?? null,
      }))
    )
    .select();

  if (insertError) throw insertError;

  const productIds = insertedProducts.map((p) => p.id);

  const { error: cacheError } = await supabase.from('search_cache').insert({
    query_text: query,
    product_ids: productIds,
    source,
  });

  if (cacheError) throw cacheError;

  return insertedProducts;
}
