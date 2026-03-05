import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export default async function AnalyticsPage() {
  const pool = getPool();

  const [
    [acceptanceRate],
    [tuitionGap],
    [demographics],
    [gender],
    [walkable],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT a.college_id, c.name, c.campus, a.year,
             a.applications_received, a.applications_admitted,
             ROUND(100.0 * a.applications_admitted / NULLIF(a.applications_received, 0), 2) AS acceptance_rate_pct
      FROM admission_statistics a
      JOIN colleges c ON c.college_id = a.college_id
      ORDER BY a.year
    `),
    pool.query<RowDataPacket[]>(`
      SELECT e.college_id, c.name, c.campus, e.year,
             e.resident_tuition, e.nonresident_tuition,
             (e.nonresident_tuition - e.resident_tuition) AS tuition_gap
      FROM expenses e
      JOIN colleges c ON c.college_id = e.college_id
      ORDER BY e.year DESC, tuition_gap DESC
    `),
    pool.query<RowDataPacket[]>(`
      SELECT x.college_id, c.name, c.campus, x.year, x.ethnicity, x.percent_enrolled
      FROM ethnicities x
      JOIN colleges c ON c.college_id = x.college_id
      WHERE x.percent_enrolled IS NOT NULL
      ORDER BY x.year DESC, x.college_id, x.percent_enrolled DESC
    `),
    pool.query<RowDataPacket[]>(`
      SELECT g.college_id, c.name, c.campus, g.year,
             SUM(CASE WHEN g.gender = 'Female' THEN g.percent_enrolled ELSE 0 END) AS female_pct,
             SUM(CASE WHEN g.gender = 'Male'   THEN g.percent_enrolled ELSE 0 END) AS male_pct,
             SUM(CASE WHEN g.gender NOT IN ('Female','Male') THEN g.percent_enrolled ELSE 0 END) AS other_pct
      FROM gender g
      JOIN colleges c ON c.college_id = g.college_id
      GROUP BY g.college_id, c.name, c.campus, g.year
      ORDER BY g.year DESC, g.college_id
    `),
    pool.query<RowDataPacket[]>(`
      SELECT c.name, c.campus, c.type, c.website_url, w.walk, w.transit, w.bike
      FROM colleges c
      JOIN walkscore_stats w ON w.college_id = c.college_id
      WHERE w.walk > 70 AND w.transit > 70
    `),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Analytics</h1>

      {/* A1: Acceptance Rate */}
      <AnalyticsSection title="Acceptance Rate Trends">
        {acceptanceRate.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Admitted</th>
                <th className="px-3 py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {acceptanceRate.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.campus}</td>
                  <td className="px-3 py-2">{r.year}</td>
                  <td className="px-3 py-2">
                    {r.applications_received?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {r.applications_admitted?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {r.acceptance_rate_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No acceptance data available.</p>
        )}
      </AnalyticsSection>

      {/* A2: Tuition Gap */}
      <AnalyticsSection title="Tuition Gap (Nonresident - Resident)">
        {tuitionGap.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Resident</th>
                <th className="px-3 py-2">Nonresident</th>
                <th className="px-3 py-2">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tuitionGap.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.campus}</td>
                  <td className="px-3 py-2">{r.year}</td>
                  <td className="px-3 py-2">
                    ${Number(r.resident_tuition).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    ${Number(r.nonresident_tuition).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-red-600">
                    ${Number(r.tuition_gap).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No tuition data available.</p>
        )}
      </AnalyticsSection>

      {/* A3: Demographics */}
      <AnalyticsSection title="Diversity Composition">
        {demographics.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Ethnicity</th>
                <th className="px-3 py-2">% Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {demographics.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.campus}</td>
                  <td className="px-3 py-2">{r.year}</td>
                  <td className="px-3 py-2">{r.ethnicity}</td>
                  <td className="px-3 py-2 font-medium">
                    {Number(r.percent_enrolled).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No demographics data available.</p>
        )}
      </AnalyticsSection>

      {/* A4: Gender Distribution */}
      <AnalyticsSection title="Gender Distribution">
        {gender.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Female %</th>
                <th className="px-3 py-2">Male %</th>
                <th className="px-3 py-2">Other %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {gender.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.campus}</td>
                  <td className="px-3 py-2">{r.year}</td>
                  <td className="px-3 py-2">
                    {Number(r.female_pct).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    {Number(r.male_pct).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    {Number(r.other_pct).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No gender data available.</p>
        )}
      </AnalyticsSection>

      {/* A5: Walkable Colleges */}
      <AnalyticsSection title="Highly Walkable & Transit-Accessible Colleges">
        <p className="mb-2 text-xs text-gray-400">
          Walk score &gt; 70 and transit score &gt; 70
        </p>
        {walkable.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Campus</th>
                <th className="px-3 py-2">Walk</th>
                <th className="px-3 py-2">Transit</th>
                <th className="px-3 py-2">Bike</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {walkable.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.campus}</td>
                  <td className="px-3 py-2">{r.walk}</td>
                  <td className="px-3 py-2">{r.transit}</td>
                  <td className="px-3 py-2">{r.bike}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">
            No colleges meet the threshold.
          </p>
        )}
      </AnalyticsSection>
    </div>
  );
}

function AnalyticsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
