-- Projects group paths (docs/plans/12-projects-group-paths.md). What was "projects" is a learner's map and becomes "paths"; "projects" is now a user's group of paths. Every user gets a default project and their paths move into it.
-- Not backward compatible: the API deployed before this migration fails until the new one is up.
ALTER TABLE "projects" RENAME TO "paths";--> statement-breakpoint
ALTER TABLE "paths" RENAME CONSTRAINT "projects_pkey" TO "paths_pkey";--> statement-breakpoint
ALTER TABLE "paths" RENAME CONSTRAINT "projects_owner_id_fkey" TO "paths_owner_id_fkey";--> statement-breakpoint
ALTER INDEX "projects_owner_id_idx" RENAME TO "paths_owner_id_idx";--> statement-breakpoint
ALTER TABLE "pages" RENAME COLUMN "project_id" TO "path_id";--> statement-breakpoint
ALTER TABLE "pages" RENAME CONSTRAINT "pages_project_id_fkey" TO "pages_path_id_fkey";--> statement-breakpoint
ALTER INDEX "pages_project_id_title_key_key" RENAME TO "pages_path_id_title_key_key";--> statement-breakpoint
ALTER TABLE "review_states" RENAME COLUMN "project_id" TO "path_id";--> statement-breakpoint
ALTER TABLE "review_states" RENAME CONSTRAINT "review_states_project_id_fkey" TO "review_states_path_id_fkey";--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_owner_id_default_key" ON "projects" USING btree ("owner_id") WHERE "projects"."is_default";--> statement-breakpoint
-- The default project, named in the account's language (a user following their browser gets English; they can rename it)
INSERT INTO "projects" ("id", "owner_id", "name", "is_default")
SELECT gen_random_uuid()::text, "id", CASE WHEN "locale" = 'pt-BR' THEN 'Geral' ELSE 'General' END, true FROM "User";--> statement-breakpoint
ALTER TABLE "paths" ADD COLUMN "project_id" text;--> statement-breakpoint
UPDATE "paths" SET "project_id" = "projects"."id" FROM "projects" WHERE "projects"."owner_id" = "paths"."owner_id" AND "projects"."is_default";--> statement-breakpoint
ALTER TABLE "paths" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "paths" ADD CONSTRAINT "paths_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "paths_project_id_idx" ON "paths" USING btree ("project_id");--> statement-breakpoint
-- A path's owner is now its project's
ALTER TABLE "paths" DROP COLUMN "owner_id";
