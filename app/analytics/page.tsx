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
    [colleges],
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
      SELECT c.college_id, c.name, c.campus, c.type, c.website_url, w.walk, w.transit, w.bike
      FROM colleges c
      JOIN walkscore_stats w ON w.college_id = c.college_id
      WHERE w.walk > 70 AND w.transit > 70
    `),
    pool.query<RowDataPacket[]>(`
      SELECT college_id, name, campus FROM colleges ORDER BY name, campus
    `),
  ]);

  // Group data by college_id
  function groupBy(rows: RowDataPacket[]) {
    const map = new Map<number, RowDataPacket[]>();
    for (const r of rows) {
      const arr = map.get(r.college_id) || [];
      arr.push(r);
      map.set(r.college_id, arr);
    }
    return map;
  }

  const acceptanceByCollege = groupBy(acceptanceRate);
  const tuitionByCollege = groupBy(tuitionGap);
  const demoByCollege = groupBy(demographics);
  const genderByCollege = groupBy(gender);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mb-8 text-sm text-gray-500">
        Data grouped by school. Scroll down for walkability rankings.
      </p>

      {colleges.map((college) => {
        const cid = college.college_id;
        const ar = acceptanceByCollege.get(cid) || [];
        const tg = tuitionByCollege.get(cid) || [];
        const dm = demoByCollege.get(cid) || [];
        const gd = genderByCollege.get(cid) || [];

        return (
          <div
            key={cid}
            className="mb-10 rounded-lg border border-gray-200 bg-white"
          >
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {college.name}
                {college.campus && (
                  <span className="ml-2 text-base font-normal text-gray-500">
                    — {college.campus}
                  </span>
                )}
              </h2>
            </div>

            <div className="divide-y divide-gray-100 px-5 py-4">
              {/* Acceptance Rate */}
              <AnalyticsSection title="Acceptance Rate Trends">
                {ar.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Received</th>
                        <th className="px-3 py-2">Admitted</th>
                        <th className="px-3 py-2">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ar.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-100">
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
                  <p className="text-sm text-gray-500">No acceptance data.</p>
                )}
              </AnalyticsSection>

              {/* Tuition Gap */}
              <AnalyticsSection title="Tuition Gap (Nonresident - Resident)">
                {tg.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Resident</th>
                        <th className="px-3 py-2">Nonresident</th>
                        <th className="px-3 py-2">Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tg.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-100">
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
                  <p className="text-sm text-gray-500">No tuition data.</p>
                )}
              </AnalyticsSection>

              {/* Demographics */}
              <AnalyticsSection title="Diversity Composition">
                {dm.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Ethnicity</th>
                        <th className="px-3 py-2">% Enrolled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dm.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-100">
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
                  <p className="text-sm text-gray-500">No demographics data.</p>
                )}
              </AnalyticsSection>

              {/* Gender Distribution */}
              <AnalyticsSection title="Gender Distribution">
                {gd.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Female %</th>
                        <th className="px-3 py-2">Male %</th>
                        <th className="px-3 py-2">Other %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {gd.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-100">
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
                  <p className="text-sm text-gray-500">No gender data.</p>
                )}
              </AnalyticsSection>
            </div>
          </div>
        );
      })}

      {/* A5: Walkable Colleges — cross-school comparison, shown separately */}
      <div className="mb-10 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Highly Walkable & Transit-Accessible Colleges
          </h2>
          <p className="text-xs text-gray-500">
            Walk score &gt; 70 and transit score &gt; 70
          </p>
        </div>
        <div className="px-5 py-4">
          {walkable.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
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
                  <tr key={i} className="hover:bg-gray-100">
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
        </div>
      </div>
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
    <div className="py-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
