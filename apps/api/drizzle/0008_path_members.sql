-- Public and shared paths (docs/plans/14-public-and-shared-paths.md): a path's visibility, and the people it is shared with or who took it.
CREATE TABLE "path_members" (
	"path_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "path_members_pkey" PRIMARY KEY("path_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "paths" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "path_members" ADD CONSTRAINT "path_members_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "path_members" ADD CONSTRAINT "path_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "path_members_user_id_idx" ON "path_members" USING btree ("user_id");