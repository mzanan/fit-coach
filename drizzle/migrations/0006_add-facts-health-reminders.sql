CREATE TABLE "health_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"started_on" text NOT NULL,
	"resolved_on" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"due_on" text,
	"done_on" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"scope" text,
	"review_on" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_items" ADD CONSTRAINT "pending_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_facts" ADD CONSTRAINT "user_facts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_events_user_started_idx" ON "health_events" USING btree ("user_id","started_on");--> statement-breakpoint
CREATE INDEX "pending_items_user_done_idx" ON "pending_items" USING btree ("user_id","done_on");--> statement-breakpoint
CREATE UNIQUE INDEX "user_facts_user_domain_subject_idx" ON "user_facts" USING btree ("user_id","domain","subject");--> statement-breakpoint
CREATE TRIGGER "user_facts_write_changes" AFTER INSERT OR UPDATE OR DELETE ON "user_facts" FOR EACH ROW EXECUTE FUNCTION record_write_change();
--> statement-breakpoint
CREATE TRIGGER "health_events_write_changes" AFTER INSERT OR UPDATE OR DELETE ON "health_events" FOR EACH ROW EXECUTE FUNCTION record_write_change();
--> statement-breakpoint
CREATE TRIGGER "pending_items_write_changes" AFTER INSERT OR UPDATE OR DELETE ON "pending_items" FOR EACH ROW EXECUTE FUNCTION record_write_change();
