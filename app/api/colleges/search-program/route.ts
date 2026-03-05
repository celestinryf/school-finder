import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q2: Search for a college with a particular program or offering
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get("keyword") || "";

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.name, c.campus, c.type, p.name AS program_name, p.degree, p.type AS program_type
       FROM colleges c
       JOIN programs p ON p.college_id = c.college_id
       WHERE p.name LIKE ?
       ORDER BY c.name, c.campus, p.name`,
      [`%${keyword}%`]
    );
    return rows;
  });
}
