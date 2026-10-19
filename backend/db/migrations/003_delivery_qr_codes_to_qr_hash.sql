-- Align delivery_qr_codes to the requested schema (qr_hash based).
-- WARNING: Drops existing delivery_qr_codes and recreates it.

DROP TABLE IF EXISTS delivery_qr_codes CASCADE;

CREATE TABLE public.delivery_qr_codes (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL,
  qr_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_qr_expires_used ON delivery_qr_codes (expires_at, used_at);


