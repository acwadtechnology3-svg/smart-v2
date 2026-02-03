-- Add foreign key constraint from drivers.id to users.id if it doesn't exist
-- This allows Supabase to automatically join the tables

DO $$ 
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'drivers_id_fkey'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE drivers
        ADD CONSTRAINT drivers_id_fkey 
        FOREIGN KEY (id) 
        REFERENCES users(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint drivers_id_fkey created successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint drivers_id_fkey already exists';
    END IF;
END $$;

-- Verify the constraint
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'drivers_id_fkey';
