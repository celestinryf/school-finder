import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q5: List departments (schools) for a college
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collegeId = Number(id);

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT d.department_id, d.department_name
       FROM departments d
       WHERE d.college_id = ?
       ORDER BY d.department_id`,
      [collegeId]
    );
    return rows;
  });
}
