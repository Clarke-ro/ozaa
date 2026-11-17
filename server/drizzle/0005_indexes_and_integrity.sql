ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_quote_id_bill_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."bill_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "scanner_devices_venue" ON "scanner_devices" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "staff_memberships_user" ON "staff_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email" ON "staff_users" USING btree (lower("email")) WHERE "staff_users"."email" is not null;--> statement-breakpoint
CREATE INDEX "menu_categories_venue" ON "menu_categories" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "menu_items_venue" ON "menu_items" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "bill_quotes_order" ON "bill_quotes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_lines_order" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_venue_created" ON "orders" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "waiter_calls_venue_created" ON "waiter_calls" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_venue_created" ON "feedback" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_facts_venue" ON "loyalty_facts" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "written_reviews_venue_created" ON "written_reviews" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "custom_links_venue" ON "custom_links" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "promos_venue" ON "promos" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "media_venue" ON "media" USING btree ("venue_id");