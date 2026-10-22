import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import XLSX from "xlsx";
import pg from "pg";

const { Pool } = pg;
const excelPath = path.resolve(process.cwd(), "database.xlsx");

if (!fs.existsSync(excelPath)) {
  console.error(`File database.xlsx tidak ditemukan di: ${excelPath}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diatur.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets["Database"];

if (!sheet) {
  console.error('Sheet "Database" tidak ditemukan di Excel.');
  await pool.end();
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const normalize = (v) => String(v ?? "").trim();

const normalizeStatus = (v) => {
  const status = normalize(v).toUpperCase();

  if (["USED", "IDLE", "ERROR"].includes(status)) {
    return status;
  }

  return null;
};

const assets = rows
  .map((row) => ({
    asset_number: Number(row["Asset - Asset#"]),
    product_model: normalize(row["Asset - Product Model Number"]),
    asset_identification_number: normalize(
      row["Asset - Asset Identification Number"]
    ),
    processor: normalize(row["Asset - Processor"]),
    serial_number: normalize(row["Asset - Serial Number"]),
    status: normalizeStatus(row["Status"])
  }))
  .filter(
    (a) =>
      Number.isFinite(a.asset_number) &&
      a.product_model &&
      a.asset_identification_number &&
      a.processor &&
      a.serial_number &&
      a.status
  );

if (!assets.length) {
  console.error(
    "Tidak ada baris aset valid. Periksa kolom aset dan Status pada Excel."
  );
  await pool.end();
  process.exit(1);
}

const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id BIGSERIAL PRIMARY KEY,
      asset_number INTEGER NOT NULL,
      product_model VARCHAR(255) NOT NULL,
      asset_identification_number VARCHAR(120) NOT NULL UNIQUE,
      processor VARCHAR(120) NOT NULL,
      serial_number VARCHAR(160) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'IDLE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tambahkan kolom status untuk tabel yang sudah ada.
  await client.query(`
    ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'IDLE';
  `);

  // Pastikan hanya status yang diperbolehkan yang dapat disimpan.
  await client.query(`
    ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS assets_status_check;
  `);

  await client.query(`
    ALTER TABLE assets
    ADD CONSTRAINT assets_status_check
    CHECK (status IN ('USED', 'IDLE', 'ERROR'));
  `);

  await client.query("TRUNCATE TABLE assets RESTART IDENTITY");

  const sql = `
    INSERT INTO assets (
      asset_number,
      product_model,
      asset_identification_number,
      processor,
      serial_number,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `;

  for (const a of assets) {
    await client.query(sql, [
      a.asset_number,
      a.product_model,
      a.asset_identification_number,
      a.processor,
      a.serial_number,
      a.status
    ]);
  }

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_model
    ON assets(product_model)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_processor
    ON assets(processor)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_asset_id
    ON assets(asset_identification_number)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_serial
    ON assets(serial_number)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_assets_status
    ON assets(status)
  `);

  await client.query("COMMIT");

  const summary = assets.reduce((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1;
    return acc;
  }, { USED: 0, IDLE: 0, ERROR: 0 });

  console.log(`Import selesai: ${assets.length} aset berhasil dimasukkan.`);
  console.log(`USED: ${summary.USED}`);
  console.log(`IDLE: ${summary.IDLE}`);
  console.log(`ERROR: ${summary.ERROR}`);
  console.log(`Baris dilewati: ${rows.length - assets.length}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Import gagal:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
