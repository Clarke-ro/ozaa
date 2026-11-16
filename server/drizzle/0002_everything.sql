CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dining_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dining_tables_venue_code" UNIQUE("venue_id","code")
);
--> statement-breakpoint
ALTER TABLE "dining_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"venue_id" text PRIMARY KEY NOT NULL,
	"paystack_mode" text,
	"paystack_public_key" text,
	"paystack_secret_encrypted" text,
	"paystack_secret_hint" text,
	"paystack_connected_at" timestamp with time zone,
	"manual" jsonb NOT NULL,
	"fee_passing" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"time_zone" text DEFAULT 'Africa/Accra' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"profile" jsonb NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"wifi" jsonb,
	"tax" jsonb,
	"whatsapp_alerts" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug"),
	CONSTRAINT "venues_slug_shape" CHECK ("venues"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scanner_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"name" text NOT NULL,
	"platform" text,
	"pairing_code" text,
	"paired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "scanner_devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "staff_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"table_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"joined_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_memberships_venue_user" UNIQUE("venue_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "staff_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text,
	"phone" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"photo" jsonb,
	"prefs" jsonb,
	"pin_hash" text,
	"pin_device_id" text,
	"pin_fails" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "staff_users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "staff_users_phone_e164" CHECK ("staff_users"."phone" ~ '^\+233[0-9]{9}$')
);
--> statement-breakpoint
ALTER TABLE "staff_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"kind" text NOT NULL,
	"position" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"schedule" jsonb
);
--> statement-breakpoint
ALTER TABLE "menu_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"price_pesewas" integer NOT NULL,
	"sale_price_pesewas" integer,
	"available" boolean DEFAULT true NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"stock_count" integer,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer DEFAULT 50 NOT NULL,
	"position" integer,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "menu_items_price" CHECK ("menu_items"."price_pesewas" >= 0),
	CONSTRAINT "menu_items_sale_below_price" CHECK ("menu_items"."sale_price_pesewas" is null or "menu_items"."sale_price_pesewas" < "menu_items"."price_pesewas"),
	CONSTRAINT "menu_items_stock" CHECK ("menu_items"."stock_count" is null or "menu_items"."stock_count" >= 0),
	CONSTRAINT "menu_items_quantity" CHECK ("menu_items"."min_quantity" between 1 and 50 and "menu_items"."max_quantity" between "menu_items"."min_quantity" and 50)
);
--> statement-breakpoint
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bill_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"mode" text NOT NULL,
	"line_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"share_pesewas" integer NOT NULL,
	"tip_pesewas" integer NOT NULL,
	"fee_pesewas" integer DEFAULT 0 NOT NULL,
	"total_pesewas" integer NOT NULL,
	"remaining_after_pesewas" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"position" integer NOT NULL,
	"menu_item_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit_price_pesewas" integer NOT NULL,
	"total_pesewas" integer NOT NULL,
	"discount_pesewas" integer DEFAULT 0 NOT NULL,
	"note" text,
	"paid" boolean DEFAULT false NOT NULL,
	CONSTRAINT "order_lines_quantity" CHECK ("order_lines"."quantity" >= 1)
);
--> statement-breakpoint
ALTER TABLE "order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"number" integer NOT NULL,
	"business_day" date NOT NULL,
	"table_code" text,
	"source" text DEFAULT 'table' NOT NULL,
	"status" text NOT NULL,
	"subtotal_pesewas" integer NOT NULL,
	"taxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"promo_discounts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery_fee_pesewas" integer DEFAULT 0 NOT NULL,
	"total_pesewas" integer NOT NULL,
	"paid_pesewas" integer DEFAULT 0 NOT NULL,
	"payment_method" text,
	"contact" jsonb,
	"delivery_address" text,
	"eta_minutes" integer,
	"cancel_reason" text,
	"guest_session_id" text,
	"created_by_staff_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"served_at" timestamp with time zone,
	CONSTRAINT "orders_daily_number" UNIQUE("venue_id","business_day","number"),
	CONSTRAINT "orders_money" CHECK ("orders"."subtotal_pesewas" >= 0 and "orders"."total_pesewas" >= 0 and "orders"."paid_pesewas" between 0 and "orders"."total_pesewas")
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "waiter_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"table_code" text NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"staff_membership_id" text,
	"staff_first_name" text,
	"reply" text,
	"guest_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "waiter_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"sentiment" text NOT NULL,
	"score" integer NOT NULL,
	"text" text NOT NULL,
	"photo_url" text,
	"contact_name" text,
	"contact_phone" text,
	"archived" boolean DEFAULT false NOT NULL,
	"visible_after" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game_scores" (
	"run_id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"guest_session_id" text NOT NULL,
	"score" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"nickname" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loyalty_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"venue_id" text NOT NULL,
	"kind" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"units" integer NOT NULL,
	"details" jsonb NOT NULL,
	"by" text,
	CONSTRAINT "loyalty_facts_units" CHECK ("loyalty_facts"."units" >= 0)
);
--> statement-breakpoint
ALTER TABLE "loyalty_facts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loyalty_members" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"phone" text NOT NULL,
	"first_name" text,
	"birthday_month_day" text,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_text_version" text NOT NULL,
	"member_since" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "loyalty_members_venue_phone" UNIQUE("venue_id","phone"),
	CONSTRAINT "loyalty_members_birthday" CHECK ("loyalty_members"."birthday_month_day" is null or "loyalty_members"."birthday_month_day" ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$')
);
--> statement-breakpoint
ALTER TABLE "loyalty_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loyalty_programs" (
	"venue_id" text PRIMARY KEY NOT NULL,
	"programme" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loyalty_programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "otp_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"table_code" text,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "written_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"order_id" text,
	"stars" integer NOT NULL,
	"first_name" text NOT NULL,
	"text" text,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "written_reviews_stars" CHECK ("written_reviews"."stars" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "written_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "custom_links" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"icon" text,
	"placement" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"status" integer NOT NULL,
	"body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_scope_key_pk" PRIMARY KEY("scope","key")
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_notification_id_user_id_pk" PRIMARY KEY("notification_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "notification_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "promos" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" text NOT NULL,
	"rule" jsonb NOT NULL,
	"code" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"discount_given_pesewas" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "promos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fee_pesewas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "quote_id" text;--> statement-breakpoint
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scanner_devices" ADD CONSTRAINT "scanner_devices_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_quotes" ADD CONSTRAINT "bill_quotes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiter_calls" ADD CONSTRAINT "waiter_calls_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_facts" ADD CONSTRAINT "loyalty_facts_member_id_loyalty_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."loyalty_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_facts" ADD CONSTRAINT "loyalty_facts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_members" ADD CONSTRAINT "loyalty_members_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_programs" ADD CONSTRAINT "loyalty_programs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "written_reviews" ADD CONSTRAINT "written_reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_links" ADD CONSTRAINT "custom_links_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_scores_week" ON "game_scores" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_facts_member" ON "loyalty_facts" USING btree ("member_id","at");--> statement-breakpoint
CREATE INDEX "otp_codes_phone" ON "otp_codes" USING btree ("phone_hash","sent_at");--> statement-breakpoint
CREATE INDEX "visits_venue_day" ON "visits" USING btree ("venue_id","started_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_age" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_venue_time" ON "notifications" USING btree ("venue_id","created_at");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_not_negative" CHECK ("payments"."fee_pesewas" >= 0);