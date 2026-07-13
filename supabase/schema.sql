-- SRS Section 7: Database — What We Are Storing
-- Run this in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run

-- Products table: one row per product we've found and checked.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  link text not null,
  source_site text,               -- which website it came from (e.g. "Amazon", "Daraz")
  price numeric,
  rating numeric,
  review_count integer,
  photo_url text,

  -- FR-03 (AI category check): is this really a vent freshener?
  is_vent_freshener boolean,
  category_confidence numeric,    -- how sure the AI is, 0-1

  -- FR-04 (AI genuineness check): does this listing look real or fake?
  genuine_score integer,          -- 0-100
  genuine_reason text,            -- short AI explanation

  last_fetched_at timestamptz default now(),
  created_at timestamptz default now()
);

-- SearchCache table: remembers what a search returned, and when.
-- This is what makes the "offline / saved" fallback possible (Section 5, step 2 and 7).
create table if not exists search_cache (
  id uuid primary key default gen_random_uuid(),
  query_text text not null,
  product_ids uuid[] not null default '{}',   -- which products matched this search
  source text not null default 'live',        -- 'live' or 'saved'
  last_run_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Speeds up "do we have a recent cached search for this query?" (Section 5, step 2).
create index if not exists idx_search_cache_query on search_cache (query_text);
