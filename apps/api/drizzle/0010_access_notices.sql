-- Notices of a path lost without choosing to (docs/plans/14-public-and-shared-paths.md), shown once.
CREATE TABLE "access_notices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"path_title" text NOT NULL,
	"owner_name" text,
	"reason" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_notices" ADD CONSTRAINT "access_notices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "access_notices_user_id_idx" ON "access_notices" USING btree ("user_id");