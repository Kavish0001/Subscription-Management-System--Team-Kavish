CREATE TYPE "TaxComputation" AS ENUM ('fixed', 'percentage');

ALTER TABLE "quotation_templates"
ADD COLUMN "is_last_forever" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "duration_count" INTEGER,
ADD COLUMN "duration_unit" "IntervalUnit";

ALTER TABLE "tax_rules"
ADD COLUMN "computation" "TaxComputation" NOT NULL DEFAULT 'percentage';
