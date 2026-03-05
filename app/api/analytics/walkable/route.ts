import { queryHandler } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

// A5: Find colleges which are highly walkable and transit accessible (score >70)
export async function GET() {
  return queryHandler(async (pool) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.name, c.campus, c.type, c.website_url, w.walk, w.transit, w.bike
       FROM colleges c
       JOIN walkscore_stats w ON w.college_id = c.college_id
       WHERE w.walk > 70 AND w.transit > 70`
    );
    return rows;
  });
}
