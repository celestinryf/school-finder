import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/db";
import ParkingFilter from "@/components/ParkingFilter";
import FacultySearch from "@/components/FacultySearch";
import type { RowDataPacket } from "mysql2";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    maxCost?: string;
    lastNamePrefix?: string;
    departmentId?: string;
  }>;
}

export default async function CollegeDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const collegeId = Number(id);
  const sp = await searchParams;
  const pool = getPool();

  // Fetch college overview
  const [colleges] = await pool.query<RowDataPacket[]>(
    `SELECT c.college_id, c.name, c.campus, c.type, c.website_url, c.fscl,
            l.street, l.city, l.state, l.postal_code,
            w.walk, w.transit, w.bike
     FROM colleges c
     LEFT JOIN location l ON l.college_id = c.college_id
     LEFT JOIN walkscore_stats w ON w.college_id = c.college_id
     WHERE c.college_id = ?`,
    [collegeId]
  );
  if (colleges.length === 0) return notFound();
  const college = colleges[0];

  // Fetch all sections in parallel
  const [departments] = await pool.query<RowDataPacket[]>(
    `SELECT department_id, department_name FROM departments WHERE college_id = ? ORDER BY department_id`,
    [collegeId]
  );

  const [programs] = await pool.query<RowDataPacket[]>(
    `SELECT p.program_id, p.name, p.degree, p.type, p.length, d.department_name
     FROM programs p
     JOIN departments d ON d.college_id = p.college_id AND d.department_id = p.department_id
     WHERE p.college_id = ?
     ORDER BY d.department_name, p.name`,
    [collegeId]
  );

  const maxCost = sp.maxCost ? Number(sp.maxCost) : null;
  const [parking] = await pool.query<RowDataPacket[]>(
    `SELECT permit, cost, rate FROM parking_permits
     WHERE college_id = ? AND (? IS NULL OR cost <= ?)
     ORDER BY cost ASC, permit`,
    [collegeId, maxCost, maxCost]
  );

  const [housing] = await pool.query<RowDataPacket[]>(
    `SELECT building_name, address, units, is_on_campus FROM housing
     WHERE college_id = ? ORDER BY is_on_campus DESC, building_name`,
    [collegeId]
  );

  const lastNamePrefix = sp.lastNamePrefix || null;
  const departmentId = sp.departmentId ? Number(sp.departmentId) : null;
  const [faculty] = await pool.query<RowDataPacket[]>(
    `SELECT f.email, f.first_name, f.last_name, f.phone_number, f.teaching_year, d.department_name
     FROM faculty f
     JOIN departments d ON d.college_id = f.college_id AND d.department_id = f.department_id
     WHERE f.college_id = ?
       AND (? IS NULL OR f.department_id = ?)
       AND (? IS NULL OR f.last_name LIKE ?)
     ORDER BY f.last_name, f.first_name`,
    [
      collegeId,
      departmentId,
      departmentId,
      lastNamePrefix,
      lastNamePrefix ? `${lastNamePrefix}%` : null,
    ]
  );

  const [phones] = await pool.query<RowDataPacket[]>(
    `SELECT phone_number, phone_type FROM college_phones WHERE college_id = ?`,
    [collegeId]
  );

  return (
    <div>
      {/* Overview */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {college.name}
          {college.campus && (
            <span className="ml-2 text-lg font-normal text-gray-500">
              — {college.campus}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {college.street && `${college.street}, `}
          {college.city}, {college.state} {college.postal_code}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
            {college.type}
          </span>
          {college.website_url && (
            <a
              href={college.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Website
            </a>
          )}
        </div>
        {(college.walk !== null ||
          college.transit !== null ||
          college.bike !== null) && (
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            {college.walk !== null && (
              <span>Walk Score: {college.walk}</span>
            )}
            {college.transit !== null && (
              <span>Transit Score: {college.transit}</span>
            )}
            {college.bike !== null && (
              <span>Bike Score: {college.bike}</span>
            )}
          </div>
        )}
        {phones.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
            {phones.map((p, i) => (
              <span key={i}>
                {p.phone_type}: {p.phone_number}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Departments */}
      <Section title="Departments" count={departments.length}>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <span
              key={d.department_id}
              className="rounded bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              {d.department_name}
            </span>
          ))}
        </div>
      </Section>

      {/* Programs */}
      <Section title="Programs" count={programs.length}>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Degree</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {programs.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.degree}</td>
                <td className="px-3 py-2">{p.type}</td>
                <td className="px-3 py-2 text-gray-500">
                  {p.department_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Parking */}
      <Section title="Parking Permits" count={parking.length}>
        <Suspense fallback={null}>
          <ParkingFilter collegeId={collegeId} />
        </Suspense>
        {parking.length > 0 ? (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Permit</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {parking.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{p.permit}</td>
                  <td className="px-3 py-2">${Number(p.cost).toFixed(2)}</td>
                  <td className="px-3 py-2">{p.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No permits match the filter.
          </p>
        )}
      </Section>

      {/* Housing */}
      <Section title="Housing" count={housing.length}>
        {housing.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Building</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">On Campus</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {housing.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{h.building_name}</td>
                  <td className="px-3 py-2">{h.address}</td>
                  <td className="px-3 py-2">{h.units ?? "—"}</td>
                  <td className="px-3 py-2">{h.is_on_campus ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No housing data available.</p>
        )}
      </Section>

      {/* Faculty */}
      <Section title="Faculty Directory" count={faculty.length}>
        <Suspense fallback={null}>
          <FacultySearch collegeId={collegeId} />
        </Suspense>
        {faculty.length > 0 ? (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {faculty.map((f) => (
                <tr key={f.email} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    {f.first_name} {f.last_name}
                  </td>
                  <td className="px-3 py-2 text-blue-600">{f.email}</td>
                  <td className="px-3 py-2">{f.phone_number ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {f.department_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No faculty found.</p>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        {title}{" "}
        <span className="text-sm font-normal text-gray-400">({count})</span>
      </h2>
      {children}
    </section>
  );
}
