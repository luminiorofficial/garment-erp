-- Drizzle generated the schema changes; the locked backfill below is hand-reviewed.
-- Drizzle executes this migration in a transaction. Prevent writes during mapping.
LOCK TABLE "job_workers" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "processes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"decimal_places" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "units_code_unique" UNIQUE("code"),
	CONSTRAINT "units_decimal_places_range" CHECK ("units"."decimal_places" BETWEEN 0 AND 6)
);
--> statement-breakpoint
ALTER TABLE "job_workers" DROP CONSTRAINT "job_workers_capacity_unit_paired";--> statement-breakpoint
DROP INDEX "job_workers_process_idx";--> statement-breakpoint
ALTER TABLE "job_workers" ADD COLUMN "process_id" uuid;--> statement-breakpoint
ALTER TABLE "job_workers" ADD COLUMN "capacity_unit_id" uuid;--> statement-breakpoint
-- Inspect and map every distinct non-null legacy value, including custom codes.
-- Canonical case/whitespace variants intentionally resolve to the same master.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "job_workers"
    WHERE ("process" IS NOT NULL AND btrim("process") = '')
       OR ("capacity_unit" IS NOT NULL AND btrim("capacity_unit") = '')) THEN
    RAISE EXCEPTION 'Blank legacy process/unit: repair explicitly before migrating';
  END IF;
END $$;
--> statement-breakpoint
INSERT INTO "processes" ("id", "code", "name")
SELECT gen_random_uuid(), code, code
FROM (SELECT DISTINCT upper(btrim("process")) AS code
      FROM "job_workers" WHERE "process" IS NOT NULL) legacy;
--> statement-breakpoint
INSERT INTO "units" ("id", "code", "name", "decimal_places")
SELECT gen_random_uuid(), code, code,
       CASE WHEN code IN ('KG', 'MTR', 'YDS') THEN 3 ELSE 0 END
FROM (SELECT DISTINCT upper(btrim("capacity_unit")) AS code
      FROM "job_workers" WHERE "capacity_unit" IS NOT NULL) legacy;
--> statement-breakpoint
UPDATE "job_workers" j SET "process_id" = p.id
FROM "processes" p WHERE p.code = upper(btrim(j."process"));
--> statement-breakpoint
UPDATE "job_workers" j SET "capacity_unit_id" = u.id
FROM "units" u WHERE u.code = upper(btrim(j."capacity_unit"));
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "job_workers" j
    LEFT JOIN "processes" p ON p.id = j.process_id
    LEFT JOIN "units" u ON u.id = j.capacity_unit_id
    WHERE (j."process" IS NOT NULL AND
           (p.id IS NULL OR p.code <> upper(btrim(j."process"))))
       OR (j.capacity_unit IS NOT NULL AND
           (u.id IS NULL OR u.code <> upper(btrim(j.capacity_unit))))
       OR ((j.capacity_per_day IS NULL) <> (j.capacity_unit_id IS NULL))
  ) THEN
    RAISE EXCEPTION 'Unmapped Job Worker process/unit or invalid capacity pair; migration aborted';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workers" ADD CONSTRAINT "job_workers_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workers" ADD CONSTRAINT "job_workers_capacity_unit_id_units_id_fk" FOREIGN KEY ("capacity_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_workers_process_idx" ON "job_workers" USING btree ("process_id");--> statement-breakpoint
ALTER TABLE "job_workers" DROP COLUMN "process";--> statement-breakpoint
ALTER TABLE "job_workers" DROP COLUMN "capacity_unit";--> statement-breakpoint
ALTER TABLE "job_workers" ADD CONSTRAINT "job_workers_capacity_unit_paired" CHECK (("job_workers"."capacity_per_day" IS NULL) = ("job_workers"."capacity_unit_id" IS NULL));
