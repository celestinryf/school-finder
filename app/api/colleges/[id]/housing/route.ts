import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q4: List housing options for a college (on-campus first)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collegeId = Number(id);

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT h.building_name, h.address, h.units, h.is_on_campus
       FROM housing h
       WHERE h.college_id = ?
       ORDER BY h.is_on_campus DESC, h.building_name`,
      [collegeId]
    );
    return rows;
  });
}
