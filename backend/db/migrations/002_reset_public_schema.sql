-- Reset RoboCourier tables in Supabase (public schema) to match our project schema.
-- WARNING: Drops RoboCourier tables in public schema.

-- Drop tables (order doesn't matter with CASCADE)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS delivery_events CASCADE;
DROP TABLE IF EXISTS delivery_qr_codes CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS robots CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Drop enums
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    DROP TYPE user_role CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    DROP TYPE delivery_status CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'robot_status') THEN
    DROP TYPE robot_status CASCADE;
  END IF;
END$$;


