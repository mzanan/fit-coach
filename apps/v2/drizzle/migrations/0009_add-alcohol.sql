ALTER TABLE "catalog_components" ADD COLUMN "alcohol_g" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "alcohol_g" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "alcohol_g" double precision DEFAULT 0 NOT NULL;