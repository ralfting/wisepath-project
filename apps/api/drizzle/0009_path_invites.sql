-- Pending invites (docs/plans/14-public-and-shared-paths.md): a path shared with an email that has no account yet.
CREATE TABLE "path_invites" (
	"path_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "path_invites_pkey" PRIMARY KEY("path_id","email")
);
--> statement-breakpoint
ALTER TABLE "path_invites" ADD CONSTRAINT "path_invites_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "path_invites_email_idx" ON "path_invites" USING btree ("email");