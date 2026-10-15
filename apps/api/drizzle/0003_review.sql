CREATE TABLE "review_states" (
	"owner_id" text NOT NULL,
	"card_id" text NOT NULL,
	"project_id" text NOT NULL,
	"page_id" text NOT NULL,
	"due" timestamp (3) with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"last_review" timestamp (3) with time zone,
	"first_review" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "review_states_pkey" PRIMARY KEY("owner_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "review_states_owner_id_first_review_idx" ON "review_states" USING btree ("owner_id","first_review");