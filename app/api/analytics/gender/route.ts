/**
 * A4: Gender distribution by college-year (pivot-style: female_pct, male_pct, other_pct).
 * Params: collegeId (optional query). Returns: one row per college-year with gender percentages.
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
      `SELECT g.college_id, c.name, c.campus, g.year,
              SUM(CASE WHEN g.gender = 'Female' THEN g.percent_enrolled ELSE 0 END) AS female_pct,
              SUM(CASE WHEN g.gender = 'Male'   THEN g.percent_enrolled ELSE 0 END) AS male_pct,
              SUM(CASE WHEN g.gender NOT IN ('Female','Male') THEN g.percent_enrolled ELSE 0 END) AS other_pct
       FROM gender g
       JOIN colleges c ON c.college_id = g.college_id
       WHERE (? IS NULL OR g.college_id = ?)
       GROUP BY g.college_id, c.name, c.campus, g.year
       ORDER BY g.year DESC, g.college_id`,
      [collegeId, collegeId]
    );
    return rows;
  });
}
