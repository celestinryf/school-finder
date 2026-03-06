import Link from "next/link";
import { Suspense } from "react";
import { getPool } from "@/lib/db";
import SearchForm from "@/components/SearchForm";
import type { RowDataPacket } from "mysql2";

interface College extends RowDataPacket {
  college_id: number;
  name: string;
  campus: string | null;
  type: string;
  website_url: string | null;
  city: string | null;
  state: string | null;
  walk: number | null;
  transit: number | null;
  bike: number | null;
}

interface ProgramResult extends RowDataPacket {
  name: string;
  campus: string | null;
  type: string;
  program_name: string;
  degree: string | null;
  program_type: string | null;
}

async function getColleges(): Promise<College[]> {
  const pool = getPool();
  const [rows] = await pool.query<College[]>(`
    SELECT c.college_id, c.name, c.campus, c.type, c.website_url,
           l.city, l.state,
           w.walk, w.transit, w.bike
    FROM colleges c
    LEFT JOIN location l ON l.college_id = c.college_id
    LEFT JOIN walkscore_stats w ON w.college_id = c.college_id
    ORDER BY c.name, c.campus
  `);
  return rows;
}

async function searchPrograms(keyword: string): Promise<ProgramResult[]> {
  const pool = getPool();
  const [rows] = await pool.query<ProgramResult[]>(
    `SELECT c.name, c.campus, c.type, p.name AS program_name, p.degree, p.type AS program_type
     FROM colleges c
     JOIN programs p ON p.college_id = c.college_id
     WHERE p.name LIKE ? OR c.name LIKE ? OR c.campus LIKE ?
     ORDER BY c.name, c.campus, p.name`,
    [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
  );
  return rows;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const { keyword } = await searchParams;
  const colleges = await getColleges();
  const programResults = keyword ? await searchPrograms(keyword) : null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        College Finder
      </h1>
      <p className="mb-6 text-gray-600">
        Explore {colleges.length} campuses. Search by college or program name.
      </p>

      <Suspense fallback={null}>
        <SearchForm />
      </Suspense>

      {programResults && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Results for &quot;{keyword}&quot; ({programResults.length}{" "}
            results)
          </h2>
          {programResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2">College</th>
                    <th className="px-3 py-2">Campus</th>
                    <th className="px-3 py-2">Program</th>
                    <th className="px-3 py-2">Degree</th>
                    <th className="px-3 py-2">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {programResults.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-100">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.campus}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.program_name}
                      </td>
                      <td className="px-3 py-2">{r.degree}</td>
                      <td className="px-3 py-2">{r.program_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No programs found.</p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          All Colleges
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((c) => (
            <Link
              key={c.college_id}
              href={`/colleges/${c.college_id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">
                {c.name}
                {c.campus && (
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    — {c.campus}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {c.city}, {c.state} &middot; {c.type}
              </p>
              {(c.walk !== null || c.transit !== null || c.bike !== null) && (
                <div className="mt-2 flex gap-3 text-xs text-gray-400">
                  {c.walk !== null && <span>Walk: {c.walk}</span>}
                  {c.transit !== null && <span>Transit: {c.transit}</span>}
                  {c.bike !== null && <span>Bike: {c.bike}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
