-- Update all foreign key constraints to reference user_profiles instead of profiles
-- Run this AFTER renaming profiles to user_profiles

-- This script will:
-- 1. Find all foreign keys pointing to 'profiles'
-- 2. Drop them
-- 3. Recreate them pointing to 'user_profiles'

DO $$
DECLARE
  fk_record RECORD;
  drop_sql TEXT;
  add_sql TEXT;
BEGIN
  RAISE NOTICE 'Starting foreign key updates...';
  
  -- Loop through all foreign keys that reference 'profiles'
  FOR fk_record IN
    SELECT 
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'profiles'
      AND tc.table_schema = 'public'
  LOOP
    -- Build DROP statement
    drop_sql := format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      fk_record.table_schema,
      fk_record.table_name,
      fk_record.constraint_name
    );
    
    -- Build ADD CONSTRAINT statement
    add_sql := format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.user_profiles(%I) ON UPDATE %s ON DELETE %s',
      fk_record.table_schema,
      fk_record.table_name,
      fk_record.constraint_name,
      fk_record.column_name,
      fk_record.foreign_column_name,
      fk_record.update_rule,
      fk_record.delete_rule
    );
    
    -- Execute DROP
    RAISE NOTICE 'Dropping: %', drop_sql;
    EXECUTE drop_sql;
    
    -- Execute ADD
    RAISE NOTICE 'Adding: %', add_sql;
    EXECUTE add_sql;
    
    RAISE NOTICE 'Updated foreign key: %.% -> %',
      fk_record.table_name,
      fk_record.constraint_name,
      'user_profiles';
  END LOOP;
  
  RAISE NOTICE 'Foreign key updates completed!';
END $$;

-- Verify no foreign keys still point to 'profiles'
DO $$
DECLARE
  count_old INTEGER;
  count_new INTEGER;
BEGIN
  -- Count FKs pointing to old 'profiles' table
  SELECT COUNT(*) INTO count_old
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'profiles';
  
  -- Count FKs pointing to new 'user_profiles' table
  SELECT COUNT(*) INTO count_new
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'user_profiles';
  
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '- Foreign keys to old "profiles" table: %', count_old;
  RAISE NOTICE '- Foreign keys to new "user_profiles" table: %', count_new;
  
  IF count_old = 0 AND count_new > 0 THEN
    RAISE NOTICE '✅ All foreign keys successfully updated!';
  ELSIF count_old > 0 THEN
    RAISE WARNING '⚠️ % foreign keys still point to old "profiles" table', count_old;
  ELSE
    RAISE WARNING '⚠️ No foreign keys found pointing to user_profiles';
  END IF;
END $$;
