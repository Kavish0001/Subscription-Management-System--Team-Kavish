ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'quotation';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'churned';
