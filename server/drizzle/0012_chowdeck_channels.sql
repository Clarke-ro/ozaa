CREATE TABLE "chowdeck_channels" (
	"venue_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"price_rule" jsonb NOT NULL,
	"hidden_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sync" jsonb NOT NULL,
	"merchant_reference" text,
	"secret_encrypted" text,
	"secret_hint" text,
	"webhook_secret_encrypted" text,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chowdeck_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chowdeck_channels" ADD CONSTRAINT "chowdeck_channels_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;