-- Progress is each learner's (docs/plans/14-public-and-shared-paths.md): studied marks move from pages to page_progress, as the marks of each path's owner.
-- pages.studied stays until the API that reads it is gone; marks made in the minute between this migration and the new API are lost.
CREATE TABLE "page_progress" (
	"user_id" text NOT NULL,
	"path_id" text NOT NULL,
	"page_id" text NOT NULL,
	"studied_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "page_progress_pkey" PRIMARY KEY("user_id","path_id","page_id")
);
--> statement-breakpoint
ALTER TABLE "page_progress" ADD CONSTRAINT "page_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_progress" ADD CONSTRAINT "page_progress_page_fkey" FOREIGN KEY ("path_id","page_id") REFERENCES "public"."pages"("path_id","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
INSERT INTO "page_progress" ("user_id", "path_id", "page_id")
SELECT "projects"."owner_id", "pages"."path_id", "pages"."id"
FROM "pages"
JOIN "paths" ON "paths"."id" = "pages"."path_id"
JOIN "projects" ON "projects"."id" = "paths"."project_id"
WHERE "pages"."studied";
