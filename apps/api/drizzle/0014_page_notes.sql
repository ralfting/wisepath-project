CREATE TABLE "page_notes" (
	"user_id" text NOT NULL,
	"path_id" text NOT NULL,
	"page_id" text NOT NULL,
	"id" text NOT NULL,
	"quote_exact" text,
	"quote_prefix" text,
	"quote_suffix" text,
	"body" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "page_notes_pkey" PRIMARY KEY("user_id","path_id","page_id","id")
);
--> statement-breakpoint
ALTER TABLE "page_notes" ADD CONSTRAINT "page_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_notes" ADD CONSTRAINT "page_notes_page_fkey" FOREIGN KEY ("path_id","page_id") REFERENCES "public"."pages"("path_id","id") ON DELETE cascade ON UPDATE cascade;