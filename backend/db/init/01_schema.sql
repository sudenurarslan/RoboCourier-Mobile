-- ========= ENUM TYPES =========
CREATE TYPE user_role AS ENUM ('sender', 'receiver', 'admin');

CREATE TYPE delivery_status AS ENUM (
    'pending',
    'waiting_pickup',
    'in_progress',
    'arrived_receiver',
    'completed',
    'cancelled',
    'failed'
);

CREATE TYPE robot_status AS ENUM (
    'idle',
    'moving',
    'waiting_qr',
    'returning',
    'charging',
    'error'
);

-- ========= TABLE: users =========
CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    phone_number   VARCHAR(20),
    role           user_role NOT NULL DEFAULT 'sender',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========= TABLE: rooms =========
CREATE TABLE rooms (
    id            BIGSERIAL PRIMARY KEY,
    room_number   VARCHAR(20) NOT NULL UNIQUE,
    floor         VARCHAR(10),
    description   TEXT,
    map_x         DOUBLE PRECISION,
    map_y         DOUBLE PRECISION,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========= TABLE: robots =========
CREATE TABLE robots (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(50) NOT NULL UNIQUE,
    status             robot_status NOT NULL DEFAULT 'idle',
    battery_level      NUMERIC(5,2) CHECK (battery_level >= 0 AND battery_level <= 100),
    current_room_id    BIGINT REFERENCES rooms(id),
    initial_room_id    BIGINT REFERENCES rooms(id),
    ip_address         INET,
    last_heartbeat_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========= TABLE: deliveries =========
CREATE TABLE deliveries (
    id                  BIGSERIAL PRIMARY KEY,
    tracking_code       VARCHAR(30) NOT NULL UNIQUE,
    sender_id           BIGINT NOT NULL REFERENCES users(id),
    receiver_id         BIGINT NOT NULL REFERENCES users(id),
    pickup_room_id      BIGINT NOT NULL REFERENCES rooms(id),
    dropoff_room_id     BIGINT NOT NULL REFERENCES rooms(id),
    robot_id            BIGINT REFERENCES robots(id),
    status              delivery_status NOT NULL DEFAULT 'pending',
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at         TIMESTAMPTZ,
    pickup_completed_at TIMESTAMPTZ,
    arrived_receiver_at TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ
);

-- ========= TABLE: delivery_qr_codes =========
CREATE TABLE public.delivery_qr_codes (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL,
  qr_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========= TABLE: delivery_events =========
CREATE TABLE delivery_events (
    id           BIGSERIAL PRIMARY KEY,
    delivery_id  BIGINT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    event_type   VARCHAR(50) NOT NULL,
    event_data   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_events_delivery_time
    ON delivery_events (delivery_id, created_at);

-- ========= TABLE: notifications =========
CREATE TABLE notifications (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_id  BIGINT REFERENCES deliveries(id) ON DELETE CASCADE,
    channel      VARCHAR(30) NOT NULL,
    title        VARCHAR(200),
    body         TEXT,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========= TABLE: system_settings =========
CREATE TABLE system_settings (
    key          VARCHAR(100) PRIMARY KEY,
    value        JSONB NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
