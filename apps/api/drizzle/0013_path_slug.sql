ALTER TABLE "paths" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "paths_slug_key" ON "paths" USING btree ("slug");