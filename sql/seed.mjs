// One-time script to seed TiDB with the SQL schema and data.
// Run: node --env-file=.env.local sql/seed.mjs

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";

const sql = readFileSync("sql/ryf_celestin_and_sia_preston_queries.sql", "utf8");

// Remove everything from the QUERIES section onward (SELECT statements)
const ddlAndDml = sql.split(/^--\s*=+\s*\n--\s*QUERIES/m)[0];

async function seed() {
  const conn = await createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 4000,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: true },
    multipleStatements: true,
  });

  console.log("Connected to TiDB.");
  console.log("Running DDL + DML (this may take a moment)...");

  await conn.query(ddlAndDml);

  console.log("Seed complete.");

  // Verify: count rows in colleges table
  const dbName = process.env.DATABASE_NAME;
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS count FROM ${dbName}.colleges`
  );
  console.log(`Verification: ${rows[0].count} colleges in database.`);

  await conn.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
