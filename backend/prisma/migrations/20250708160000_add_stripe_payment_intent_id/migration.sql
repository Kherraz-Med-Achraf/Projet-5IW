-- CreateEnum: Add FAILED to PaymentStatus if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FAILED' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'PaymentStatus'
        )
    ) THEN
        ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';
    END IF;
END $$;

-- AlterTable: Add stripePaymentIntentId column if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EventRegistration' 
        AND column_name = 'stripePaymentIntentId'
    ) THEN
        ALTER TABLE "EventRegistration" ADD COLUMN "stripePaymentIntentId" TEXT;
    END IF;
END $$; 