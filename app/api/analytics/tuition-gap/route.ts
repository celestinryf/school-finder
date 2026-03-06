/**
 * A2: Tuition gap (nonresident minus resident) by year for each college.
 * Params: none. Returns: rows with resident/nonresident tuition and computed tuition_gap, ordered by year desc.
 */
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";
export async function GET() {
  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.college_id, c.name, c.campus, e.year,
              e.resident_tuition, e.nonresident_tuition,
              (e.nonresident_tuition - e.resident_tuition) AS tuition_gap
       FROM expenses e
       JOIN colleges c ON c.college_id = e.college_id
       ORDER BY e.year DESC, tuition_gap DESC`
    );
    return rows;
  });
}
