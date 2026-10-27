CREATE TABLE "question_answers" (
	"user_id" text NOT NULL,
	"path_id" text NOT NULL,
	"page_id" text NOT NULL,
	"question_id" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "question_answers_pkey" PRIMARY KEY("user_id","path_id","page_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_page_fkey" FOREIGN KEY ("path_id","page_id") REFERENCES "public"."pages"("path_id","id") ON DELETE cascade ON UPDATE cascade;