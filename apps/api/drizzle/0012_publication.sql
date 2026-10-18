CREATE TABLE "publication_requests" (
	"path_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"decided_at" timestamp (3) with time zone
);
--> statement-breakpoint
ALTER TABLE "paths" ADD COLUMN "audience" text;--> statement-breakpoint
ALTER TABLE "paths" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "publication_requests" ADD CONSTRAINT "publication_requests_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "public"."paths"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "publication_requests_status_idx" ON "publication_requests" USING btree ("status");