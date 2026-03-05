import { NextRequest } from "next/server";
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// Q7: Search faculty by last name prefix and department (directory-style)
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
  const lastNamePrefix = searchParams.get("lastNamePrefix") || null;

  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT f.email, f.first_name, f.last_name, f.phone_number, f.teaching_year
       FROM faculty f
       WHERE f.college_id = ?
         AND (? IS NULL OR f.department_id = ?)
         AND (? IS NULL OR f.last_name LIKE ?)
       ORDER BY f.last_name, f.first_name`,
      [collegeId, departmentId, departmentId, lastNamePrefix, lastNamePrefix ? `${lastNamePrefix}%` : null]
    );
    return rows;
  });
}
