ALTER TABLE "feedback" ADD COLUMN "guest_session_id" text;--> statement-breakpoint
CREATE INDEX "feedback_session" ON "feedback" USING btree ("venue_id","guest_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "written_reviews_one_order" ON "written_reviews" USING btree ("order_id") WHERE "written_reviews"."order_id" is not null;