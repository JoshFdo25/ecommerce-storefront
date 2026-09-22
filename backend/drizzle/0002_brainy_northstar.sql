ALTER TABLE "categories" ADD COLUMN "image_url" varchar(255);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "shipping_address" jsonb;