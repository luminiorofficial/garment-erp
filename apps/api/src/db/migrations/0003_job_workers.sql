CREATE TABLE "job_workers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text,
	"billing_address" text,
	"operating_address" text,
	"process" text,
	"capacity_per_day" integer,
	"capacity_unit" text,
	"lead_time_days" integer,
	"rate_agreement" text,
	"payment_terms" text,
	"tax_information" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "job_workers_code_unique" UNIQUE("code"),
	CONSTRAINT "job_workers_capacity_per_day_positive" CHECK ("job_workers"."capacity_per_day" > 0),
	CONSTRAINT "job_workers_capacity_unit_paired" CHECK (("job_workers"."capacity_per_day" IS NULL) = ("job_workers"."capacity_unit" IS NULL)),
	CONSTRAINT "job_workers_lead_time_days_non_negative" CHECK ("job_workers"."lead_time_days" >= 0)
);
--> statement-breakpoint
ALTER TABLE "job_workers" ADD CONSTRAINT "job_workers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workers" ADD CONSTRAINT "job_workers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_workers_name_idx" ON "job_workers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "job_workers_process_idx" ON "job_workers" USING btree ("process");