/**
 * Q6: List programs for a college, optionally filtered by department or degree.
 * Params: id (path), departmentId (optional query), degree (optional query). Returns: array of programs.
 */
import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";
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
