CREATE TABLE "otp_phone_limits" (
	"phone_hash" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone[] DEFAULT '{}'::timestamptz[] NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"fail_window_started_at" timestamp with time zone NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "otp_phone_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "otp_send_buckets" (
	"bucket" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone[] DEFAULT '{}'::timestamptz[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_send_buckets" ENABLE ROW LEVEL SECURITY;