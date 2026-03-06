/**
 * Health check endpoint. Pings the database with SELECT 1.
 * Params: none. Returns: { status, result } on success, { status, message } on error.
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT 1 AS ok");
    return NextResponse.json({ status: "connected", result: rows });
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
