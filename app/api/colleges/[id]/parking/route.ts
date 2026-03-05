import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q3: Find parking permits for a college under a max cost
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collegeId = Number(id);
  const { searchParams } = request.nextUrl;
  const maxCost = searchParams.get("maxCost")
    ? Number(searchParams.get("maxCost"))
    : null;

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT pp.permit, pp.cost, pp.rate
       FROM parking_permits pp
       WHERE pp.college_id = ?
         AND (? IS NULL OR pp.cost <= ?)
       ORDER BY pp.cost ASC, pp.permit`,
      [collegeId, maxCost, maxCost]
    );
    return rows;
  });
}
