-- Apply schema improvements to an existing DB.
-- Safe to run multiple times.

-- ========= TRIGGERS / INDEXES =========

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users';
    EXECUTE 'CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (is_active);
CREATE INDEX IF NOT EXISTS idx_robots_status ON robots (status);
CREATE INDEX IF NOT EXISTS idx_deliveries_sender_time ON deliveries (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_receiver_time ON deliveries (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_status_time ON deliveries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_qr_status_expires ON delivery_qr_codes (status, expires_at);


