import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

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

export async function mutationHandler(
  fn: (pool: ReturnType<typeof getPool>) => Promise<ResultSetHeader>
): Promise<NextResponse> {
  try {
    const pool = getPool();
    const result = await fn(pool);
    return NextResponse.json({
      affectedRows: result.affectedRows,
      insertId: result.insertId,
    });
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    const status = error instanceof Error && error.message.includes("Duplicate entry") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
