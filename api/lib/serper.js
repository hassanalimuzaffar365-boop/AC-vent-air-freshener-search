/**
 * SRS Feature 1: "Search the internet for product links using the search API."
 * Uses Serper.dev's Google Shopping engine, since it returns exactly the
 * fields we need per product: title, price, rating, review count, image, link.
 */

const SERPER_URL = 'https://google.serper.dev/shopping';

/**
 * Calls Serper.dev and returns a normalized list of raw product candidates.
 * Throws if the API key is missing, the request fails, or Serper returns
 * an error — the caller (api/search.js) decides what to do when that happens
 * (SRS Section 5, step 7: fall back to saved results).
 */
export async function searchProducts(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY is not set');
  }

  const response = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  const data = await response.json();
  const rawResults = data.shopping || [];

  // Normalize Serper's field names to our own product shape (matches
  // the `products` table in supabase/schema.sql), so nothing downstream
  // needs to know Serper's exact response format.
  return rawResults.map((item) => ({
    name: item.title || 'Untitled product',
    link: item.link,
    source_site: item.source || 'Unknown',
    price: parsePriceToNumber(item.price),
    rating: item.rating ?? null,
    review_count: item.ratingCount ?? 0,
    photo_url: item.imageUrl || null,
  }));
}

/**
 * Serper returns price as a string like "$12.99" or "PKR 1,299" — pull
 * out just the number so it matches the `numeric` column in Supabase.
 */
function parsePriceToNumber(priceString) {
  if (!priceString) return null;
  const match = String(priceString).replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}
