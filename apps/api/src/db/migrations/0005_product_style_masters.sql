CREATE TABLE "sizes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "sizes_code_unique" UNIQUE("code"),
	CONSTRAINT "sizes_sequence_non_negative" CHECK ("sizes"."sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"reference" text,
	"hex_value" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "colors_code_unique" UNIQUE("code"),
	CONSTRAINT "colors_hex_value_format" CHECK ("colors"."hex_value" IS NULL OR "colors"."hex_value" ~ '^#[0-9A-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "style_colors" (
	"style_id" uuid NOT NULL,
	"color_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "style_colors_style_id_color_id_pk" PRIMARY KEY("style_id","color_id")
);
--> statement-breakpoint
CREATE TABLE "style_sizes" (
	"style_id" uuid NOT NULL,
	"size_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "style_sizes_style_id_size_id_pk" PRIMARY KEY("style_id","size_id")
);
--> statement-breakpoint
CREATE TABLE "style_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"style_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"specification" text,
	"change_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "style_versions_style_number_unique" UNIQUE("style_id","version_number"),
	CONSTRAINT "style_versions_number_positive" CHECK ("style_versions"."version_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "styles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "styles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_colors" ADD CONSTRAINT "style_colors_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_colors" ADD CONSTRAINT "style_colors_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_sizes" ADD CONSTRAINT "style_sizes_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_sizes" ADD CONSTRAINT "style_sizes_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_versions" ADD CONSTRAINT "style_versions_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_versions" ADD CONSTRAINT "style_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styles" ADD CONSTRAINT "styles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styles" ADD CONSTRAINT "styles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styles" ADD CONSTRAINT "styles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styles" ADD CONSTRAINT "styles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sizes_sequence_idx" ON "sizes" USING btree ("sequence");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "style_colors_color_idx" ON "style_colors" USING btree ("color_id");--> statement-breakpoint
CREATE INDEX "style_sizes_size_idx" ON "style_sizes" USING btree ("size_id");--> statement-breakpoint
CREATE INDEX "styles_name_idx" ON "styles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "styles_product_idx" ON "styles" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "styles_customer_idx" ON "styles" USING btree ("customer_id");