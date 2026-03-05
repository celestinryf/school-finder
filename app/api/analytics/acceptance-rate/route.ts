import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// A1: Acceptance rate trend by year (admitted/received)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const collegeId = searchParams.get("collegeId")
    ? Number(searchParams.get("collegeId"))
    : null;

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.college_id, c.name, c.campus, a.year,
              a.applications_received, a.applications_admitted,
              ROUND(100.0 * a.applications_admitted / NULLIF(a.applications_received, 0), 2) AS acceptance_rate_pct
       FROM admission_statistics a
       JOIN colleges c ON c.college_id = a.college_id
       WHERE (? IS NULL OR a.college_id = ?)
       ORDER BY a.year`,
      [collegeId, collegeId]
    );
    return rows;
  });
}
