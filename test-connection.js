// Standalone debug script — run with: node test-connection.js
// This bypasses `vercel dev` entirely, so it sidesteps the Windows
// libuv crash and lets us confirm Serper + Supabase actually work.

import 'dotenv/config';
import { searchProducts } from './api/lib/serper.js';
import { saveResultsToCache, getFreshCache } from './api/lib/cache.js';

async function main() {
  console.log('--- Step 1: Testing Serper.dev ---');
  const results = await searchProducts('lavender vent air freshener');
  console.log(`Got ${results.length} results from Serper. First one:`, results[0]);

  console.log('\n--- Step 2: Testing Supabase save ---');
  const saved = await saveResultsToCache('test query 123', results.slice(0, 3), 'live');
  console.log(`Saved ${saved.length} products to Supabase.`);

  console.log('\n--- Step 3: Testing cache read-back ---');
  const cached = await getFreshCache('test query 123');
  console.log(`Read back ${cached ? cached.length : 0} products from cache.`);

  console.log('\nIf all three steps printed without errors, Supabase + Serper are both working.');
}

main().catch((err) => {
  console.error('\n❌ FAILED:', err.message);
  console.error(err);
});