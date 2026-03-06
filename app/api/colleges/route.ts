/**
 * List all colleges with location and walkscore data.
 * Params: none. Returns: array of colleges with city, state, walk/transit/bike scores.
 */
import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT c.college_id, c.name, c.campus, c.type, c.website_url,
             l.city, l.state, l.postal_code,
             w.walk, w.transit, w.bike
      FROM colleges c
      LEFT JOIN location l ON l.college_id = c.college_id
      LEFT JOIN walkscore_stats w ON w.college_id = c.college_id
      ORDER BY c.name, c.campus
    `);
    return rows;
  });
}
