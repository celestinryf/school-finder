/**
 * A3: Diversity composition — ethnicity breakdown per college-year.
 * Params: collegeId (optional query). Returns: rows with ethnicity and percent_enrolled, ordered by percent desc.
 */
import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const collegeId = searchParams.get("collegeId")
    ? Number(searchParams.get("collegeId"))
    : null;

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT x.college_id, c.name, c.campus, x.year, x.ethnicity, x.percent_enrolled
       FROM ethnicities x
       JOIN colleges c ON c.college_id = x.college_id
       WHERE x.percent_enrolled IS NOT NULL
         AND (? IS NULL OR x.college_id = ?)
       ORDER BY x.year DESC, x.college_id, x.percent_enrolled DESC`,
      [collegeId, collegeId]
    );
    return rows;
  });
}
