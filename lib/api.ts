/**
 * Shared API route handler that wraps a database query in try/catch.
 *
 * Every API route passes a callback that receives the pool and returns rows.
 * This wrapper handles pool acquisition, JSON serialization, and error
 * sanitization (only exposes error details in dev to avoid leaking SQL info).
 */

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type QueryResult = RowDataPacket[];

export async function queryHandler(
  fn: (pool: ReturnType<typeof getPool>) => Promise<QueryResult>
): Promise<NextResponse> {
  try {
    const pool = getPool();
    const rows = await fn(pool);
    return NextResponse.json(rows);
  } catch (error: unknown) {
    // Surface real error messages in dev; hide them in production
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
