# Vent Freshener Search — Simple Version

Implementation of `Project_Plan_ALI_Simple.docx` (v3.1). A search tool for car AC
vent-mount air fresheners: live web search + AI category/genuineness checks +
offline fallback.

**Stack:** React (Vite) frontend + Vercel serverless functions (`/api`) + Supabase (Postgres)
**Research picks:** Serper.dev (search API) + Google Gemini (AI API) — both free, no credit card.

---

## Day 1 setup (do this first)

### 1. Install dependencies
```bash
npm install
```

### 2. Get your Serper.dev API key
1. Sign up at [serper.dev](https://serper.dev) — no credit card needed
2. Copy your API key from the dashboard

### 3. Set up local environment variables
```bash
cp .env.example .env
```
Open `.env` and paste your Serper key into `SERPER_API_KEY=`. Leave the Gemini/Supabase
lines blank for now — Day 1 doesn't need them yet.

### 4. Install the Vercel CLI (runs both frontend + serverless functions together)
```bash
npm install -g vercel
vercel dev
```
This starts everything at `http://localhost:3000`.

### 5. Test it
Open `http://localhost:3000`, type a search like "lavender vent air freshener", hit Search.
You should see raw JSON with real product results from Serper.

**If it fails:** check the terminal running `vercel dev` for the exact error — usually a
missing or wrong `SERPER_API_KEY`.

---

## GitHub — commit as you go (this is graded, see SRS Section 10)

### First-time setup
```bash
git init
git add .
git commit -m "Project scaffold: Vite frontend, Vercel API folder, Supabase schema"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

### After Day 1 feature 1 (live search) works
```bash
git add api/search.js api/lib/serper.js
git commit -m "Add live search API integration

Calls Serper.dev's Google Shopping engine and returns normalized
product results (name, price, rating, review count, image, link)."
git push
```

Don't commit `.env` — it's already in `.gitignore`, so your API key stays private.

---

## What's built so far (Day 1 only)

- `api/lib/serper.js` — Serper.dev client, normalizes results to our product shape
- `api/search.js` — `/api/search?q=...` endpoint, live search only (no DB, no AI yet)
- `src/App.jsx` — temporary test harness (shows raw JSON) — gets replaced by the real
  results page UI later
- `supabase/schema.sql` — database schema, ready for Day 2 (not connected yet)

## What's next (Day 2)

- Save results to Supabase with a timestamp
- Check for a recent cached search before hitting Serper
- Fall back to saved results if Serper fails
- AI category check (Gemini): is this really a vent freshener?
- AI genuineness check (Gemini): does this listing look real or fake?
