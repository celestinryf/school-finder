import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT) || 4000,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}
