-- Search everywhere: trigram indexes over titles and texts folded to lower case without accents.
-- unaccent() is only STABLE (its dictionary could change), so it can't be indexed as is; wp_fold
-- names the dictionary and is declared IMMUTABLE, which is what the indexes and queries use.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION wp_fold(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, $1)) $$;--> statement-breakpoint
CREATE INDEX "pages_title_search_idx" ON "pages" USING gin (wp_fold("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "pages_content_search_idx" ON "pages" USING gin (wp_fold("content") gin_trgm_ops);