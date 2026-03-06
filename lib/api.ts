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
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
