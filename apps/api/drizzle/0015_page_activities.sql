CREATE TABLE "activity_progress" (
	"user_id" text NOT NULL,
	"path_id" text NOT NULL,
	"page_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"done_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "activity_progress_pkey" PRIMARY KEY("user_id","path_id","page_id","activity_id")
);
--> statement-breakpoint
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_page_fkey" FOREIGN KEY ("path_id","page_id") REFERENCES "public"."pages"("path_id","id") ON DELETE cascade ON UPDATE cascade;