UPDATE "subscription_orders"
SET "status" = 'in_progress'
WHERE "status" = 'active';
