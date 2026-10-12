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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const normalize = (v) => String(v ?? "").trim();

const assets = rows.map((row, index) => ({
  asset_number: Number(row["Asset - Asset#"]),
  product_model: normalize(row["Asset - Product Model Number"]),
  asset_identification_number: normalize(row["Asset - Asset Identification Number"]),
  processor: normalize(row["Asset - Processor"]),
  serial_number: normalize(row["Asset - Serial Number"])
})).filter((a) => a.product_model && a.asset_identification_number && a.processor && a.serial_number);

if (!assets.length) {
  console.error("Tidak ada baris aset valid yang ditemukan.");
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query("TRUNCATE TABLE assets RESTART IDENTITY");

  const sql = `
    INSERT INTO assets
      (asset_number, product_model, asset_identification_number, processor, serial_number)
    VALUES ($1, $2, $3, $4, $5)
  `;

  for (const a of assets) {
    await client.query(sql, [
      a.asset_number,
      a.product_model,
      a.asset_identification_number,
      a.processor,
      a.serial_number
    ]);
  }

  await client.query("CREATE INDEX IF NOT EXISTS idx_assets_model ON assets(product_model)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_assets_processor ON assets(processor)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_identification_number)");
  await client.query("CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number)");
  await client.query("COMMIT");

  console.log(`Import selesai: ${assets.length} aset berhasil dimasukkan.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Import gagal:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
