import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const username = "admin";
const email = "admin@accord.co.id";
const password = "admin123";

const passwordHash = await bcrypt.hash(password, 12);

await pool.query(
  `
  INSERT INTO users
    (username, email, password_hash, role)
  VALUES
    ($1, $2, $3, 'admin')
  ON CONFLICT (username)
  DO NOTHING
  `,
  [username, email, passwordHash]
);

console.log("Admin berhasil dibuat.");
console.log("Username:", username);
console.log("Password:", password);

await pool.end();