-- Seed: users only (dev)
-- password = "password123" (sha256 hex)
INSERT INTO users (full_name, email, password_hash, role, is_active)
VALUES
  ('Admin User',   'admin@robocourier.local',    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin',   TRUE),
  ('Sender User',  'sender@robocourier.local',   'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'sender',  TRUE),
  ('Receiver User','receiver@robocourier.local', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'receiver',TRUE)
ON CONFLICT (email) DO NOTHING;


