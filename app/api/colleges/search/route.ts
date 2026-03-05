import { NextRequest, NextResponse } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q1: Find colleges in a particular area and see what programs are available
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const state = searchParams.get("state");
  if (!state) {
    return NextResponse.json({ error: "state is required" }, { status: 400 });
  }
  const excludeCity = searchParams.get("excludeCity") || "";

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.name, c.campus, p.name AS program_name, p.degree, p.type AS program_type,
              l.city, l.state
       FROM colleges c
       JOIN programs p ON p.college_id = c.college_id
       JOIN location l ON l.college_id = c.college_id
       WHERE l.state = ?
         AND (? = '' OR l.city <> ?)
       ORDER BY c.name, c.campus, p.name`,
      [state, excludeCity, excludeCity]
    );
    return rows;
  });
}
