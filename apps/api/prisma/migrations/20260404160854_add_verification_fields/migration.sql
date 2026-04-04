-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verification_code" TEXT,
ADD COLUMN     "verification_expires_at" TIMESTAMP(3);
