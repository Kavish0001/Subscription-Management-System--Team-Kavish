CREATE TABLE "payment_terms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "due_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_terms_name_key" ON "payment_terms"("name");
CREATE INDEX "payment_terms_is_active_idx" ON "payment_terms"("is_active");

INSERT INTO "payment_terms" ("id", "name", "description", "due_days")
SELECT gen_random_uuid(), source.name, 'Backfilled from existing subscription or quotation usage', 0
FROM (
    SELECT DISTINCT TRIM("payment_term_label") AS name
    FROM "subscription_orders"
    WHERE "payment_term_label" IS NOT NULL AND BTRIM("payment_term_label") <> ''
    UNION
    SELECT DISTINCT TRIM("payment_term_label") AS name
    FROM "quotation_templates"
    WHERE "payment_term_label" IS NOT NULL AND BTRIM("payment_term_label") <> ''
    UNION
    SELECT DISTINCT TRIM("payment_term_label") AS name
    FROM "invoices"
    WHERE "payment_term_label" IS NOT NULL AND BTRIM("payment_term_label") <> ''
) AS source;
