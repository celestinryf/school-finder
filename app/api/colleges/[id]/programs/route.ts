import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q6: List programs for a department (with basic filters)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collegeId = Number(id);
  const { searchParams } = request.nextUrl;
  const departmentId = searchParams.get("departmentId")
    ? Number(searchParams.get("departmentId"))
    : null;
  const degree = searchParams.get("degree") || null;

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.program_id, p.name, p.degree, p.type, p.length
       FROM programs p
       WHERE p.college_id = ?
         AND (? IS NULL OR p.department_id = ?)
         AND (? IS NULL OR p.degree = ?)
       ORDER BY p.name`,
      [collegeId, departmentId, departmentId, degree, degree]
    );
    return rows;
  });
}
