// Run with: node test-accuracy.js
// SRS Section 8: "Make a small list yourself of 10 products you already
// know are genuine vent fresheners, and 10 that are fake, wrong-category,
// or spam. Run them through your AI questions and check how many it
// gets right. This is your proof that the feature actually works."

import 'dotenv/config';
import { checkCategoryBatch, checkGenuinenessBatch } from './api/lib/gemini.js';

// expectedIsVentFreshener: ground truth for Feature 3 (category check)
// expectedTrustworthy: ground truth for Feature 4 (genuineness check) —
//   only meaningful for items that ARE vent fresheners, since that's the
//   only case where genuineness checking would run in the real pipeline.
const testProducts = [
  // --- 10 genuine vent-mount fresheners (real brands, normal listings) ---
  { name: 'Little Trees Car Vent Clip Air Freshener - New Car Scent', price: 4.99, rating: 4.5, review_count: 3200, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Febreze Vent Clip Car Air Freshener - Linen & Sky', price: 5.99, rating: 4.4, review_count: 9200, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Yankee Candle Smart Vent Clip - Pink Sands', price: 5.49, rating: 4.3, review_count: 578, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Glade Vent Clip Car Air Freshener - Clean Linen', price: 3.71, rating: 4.3, review_count: 700, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Air Jungles Car Air Freshener Vent Clip - Lavender', price: 7.99, rating: 4.6, review_count: 1500, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Ambi Pur Car Vent Mini Clip - Lavender Comfort', price: 6.49, rating: 4.7, review_count: 2100, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'California Scents Vent Stick - Hawaiian Breeze', price: 4.29, rating: 4.2, review_count: 890, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: "Chemical Guys Vent Clip Air Freshener - New Car Smell", price: 8.99, rating: 4.6, review_count: 1100, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: 'Bahama & Co. Car Vent Clip - Tropical Paradise', price: 6.99, rating: 4.4, review_count: 640, expectedIsVentFreshener: true, expectedTrustworthy: true },
  { name: "Meguiar's Whole Car Air Freshener Vent Clip", price: 7.49, rating: 4.5, review_count: 2300, expectedIsVentFreshener: true, expectedTrustworthy: true },

  // --- 10 fake / wrong-category / spam ---
  { name: 'Febreze Air Mist Spray - Lavender', price: 5.94, rating: 4.6, review_count: 6700, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Glade PlugIns Scented Oil Refill', price: 6.29, rating: 4.5, review_count: 4100, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Little Trees Hanging Car Air Freshener - Black Ice', price: 1.49, rating: 4.5, review_count: 12000, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Yankee Candle Wax Melt Cubes - Car Scent', price: 6.99, rating: 4.4, review_count: 320, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Generic Gel Can Air Freshener - Ocean Breeze', price: 2.49, rating: 4.0, review_count: 210, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Car Air Freshener Vent Clip Lavender', price: 0.99, rating: null, review_count: 0, expectedIsVentFreshener: true, expectedTrustworthy: false },
  { name: 'Best Car Vent Freshener Clip 100% Genuine Original!!', price: 45.00, rating: 3.8, review_count: 2, expectedIsVentFreshener: true, expectedTrustworthy: false },
  { name: 'Room Reed Diffuser Set with Rattan Sticks', price: 12.99, rating: 4.3, review_count: 540, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'USB Car Charger with Built-in Air Freshener Combo', price: 9.99, rating: 3.9, review_count: 85, expectedIsVentFreshener: false, expectedTrustworthy: null },
  { name: 'Vent Clip Freshener Pack of 50 Wholesale Lot', price: 9.99, rating: null, review_count: 0, expectedIsVentFreshener: true, expectedTrustworthy: false },
];

async function main() {
  console.log(`Testing ${testProducts.length} products against the AI checks...\n`);

  const categoryResults = await checkCategoryBatch(testProducts);
  const genuinenessResults = await checkGenuinenessBatch(testProducts);

  let categoryCorrect = 0;
  let genuinenessCorrect = 0;
  let genuinenessTotal = 0;

  console.log('--- Feature 3: Category check ---');
  testProducts.forEach((p, i) => {
    const got = categoryResults[i].is_vent_freshener;
    const expected = p.expectedIsVentFreshener;
    const match = got === expected;
    if (match) categoryCorrect++;
    console.log(
      `${match ? '✅' : '❌'} "${p.name}" — expected: ${expected}, AI said: ${got} (confidence ${categoryResults[i].category_confidence})`
    );
  });

  console.log('\n--- Feature 4: Genuineness check (only for items that are vent fresheners) ---');
  testProducts.forEach((p, i) => {
    if (p.expectedTrustworthy === null) return; // not applicable, wrong-category item
    genuinenessTotal++;
    const gotTrustworthy = genuinenessResults[i].genuine_score >= 50;
    const match = gotTrustworthy === p.expectedTrustworthy;
    if (match) genuinenessCorrect++;
    console.log(
      `${match ? '✅' : '❌'} "${p.name}" — expected trustworthy: ${p.expectedTrustworthy}, AI score: ${genuinenessResults[i].genuine_score} (${genuinenessResults[i].genuine_reason})`
    );
  });

  console.log('\n=== SUMMARY ===');
  console.log(
    `Category check accuracy: ${categoryCorrect}/${testProducts.length} (${Math.round(
      (categoryCorrect / testProducts.length) * 100
    )}%)`
  );
  console.log(
    `Genuineness check accuracy: ${genuinenessCorrect}/${genuinenessTotal} (${Math.round(
      (genuinenessCorrect / genuinenessTotal) * 100
    )}%)`
  );
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  console.error(err);
});