CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  asset_number INTEGER NOT NULL,
  product_model VARCHAR(255) NOT NULL,
  asset_identification_number VARCHAR(120) NOT NULL UNIQUE,
  processor VARCHAR(120) NOT NULL,
  serial_number VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_model ON assets(product_model);
CREATE INDEX IF NOT EXISTS idx_assets_processor ON assets(processor);
CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_identification_number);
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'IDLE';