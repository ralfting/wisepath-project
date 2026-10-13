CREATE TABLE "pages" (
	"id" text NOT NULL,
	"project_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"title_key" text,
	"content" text DEFAULT '' NOT NULL,
	"studied" boolean DEFAULT false NOT NULL,
	"module" boolean,
	"color" text,
	"icon" text,
	"updated_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "pages_pkey" PRIMARY KEY("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"root_page_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"googleId" text,
	"githubId" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"sample_seeded_at" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_project_id_title_key_key" ON "pages" USING btree ("project_id","title_key");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "User_googleId_key" ON "User" USING btree ("googleId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_githubId_key" ON "User" USING btree ("githubId");