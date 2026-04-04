ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "default_contact_id" UUID;

ALTER TABLE "contacts"
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "created_by" UUID;

UPDATE "users" u
SET
  "name" = COALESCE(u."name", c."name"),
  "phone" = COALESCE(u."phone", c."phone"),
  "address" = COALESCE(u."address", c."address"),
  "default_contact_id" = COALESCE(u."default_contact_id", c."id")
FROM (
  SELECT DISTINCT ON ("user_id")
    "id",
    "user_id",
    "name",
    "phone",
    "address"
  FROM "contacts"
  WHERE "user_id" IS NOT NULL
  ORDER BY "user_id", "is_default" DESC, "created_at" ASC
) c
WHERE u."id" = c."user_id";

UPDATE "contacts" c
SET
  "email" = COALESCE(c."email", u."email"),
  "created_by" = COALESCE(c."created_by", c."user_id", u."id")
FROM "users" u
WHERE c."user_id" = u."id";

CREATE UNIQUE INDEX IF NOT EXISTS "users_default_contact_id_key" ON "users"("default_contact_id");
CREATE INDEX IF NOT EXISTS "users_default_contact_id_idx" ON "users"("default_contact_id");
CREATE INDEX IF NOT EXISTS "contacts_created_by_idx" ON "contacts"("created_by");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_default_contact_id_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_default_contact_id_fkey"
    FOREIGN KEY ("default_contact_id") REFERENCES "contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_created_by_fkey'
  ) THEN
    ALTER TABLE "contacts"
    ADD CONSTRAINT "contacts_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
