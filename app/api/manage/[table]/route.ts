import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { TABLE_CONFIGS, type TableKey } from "@/lib/table-config";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type Body = Record<string, unknown>;

const DEFAULT_LIMIT = 500;

function errorResponse(error: unknown) {
  const isDuplicate = error instanceof Error && error.message.includes("Duplicate entry");
  const isJsonParse = error instanceof SyntaxError;
  const status = isDuplicate ? 409 : isJsonParse ? 400 : 500;
  const message = isDuplicate
    ? "A record with this key already exists"
    : isJsonParse
      ? "Invalid JSON in request body"
      : process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
  return NextResponse.json({ error: message }, { status });
}

function requireFields(body: Body, fields: string[]): string | null {
  const missing = fields.filter((f) => body[f] === null || body[f] === undefined || body[f] === "");
  return missing.length > 0 ? `Missing required fields: ${missing.join(", ")}` : null;
}

function requireParams(sp: URLSearchParams, names: string[]): string | null {
  const missing = names.filter((n) => !sp.get(n));
  return missing.length > 0 ? `Missing required params: ${missing.join(", ")}` : null;
}

function validateBounds(tableKey: string, body: Body): string | null {
  const config = TABLE_CONFIGS.find((t) => t.key === tableKey);
  if (!config) return null;
  for (const col of config.columns) {
    const val = body[col.name];
    if (val === null || val === undefined || val === "") continue;
    const num = Number(val);
    if (isNaN(num)) continue;
    if (col.min !== undefined && num < col.min) {
      return `${col.label} must be at least ${col.min}`;
    }
    if (col.max !== undefined && num > col.max) {
      return `${col.label} must be at most ${col.max}`;
    }
  }
  return null;
}

function isTableKey(key: string): key is TableKey {
  return key in TABLES;
}

// ============================================================
// Explicit SQL templates for each table
// ============================================================

const TABLES: Record<TableKey, {
  select: string;
  insert: string;
  insertParams: (b: Body) => unknown[];
  insertRequired: string[];
  update: string;
  updateParams: (b: Body) => unknown[];
  updateRequired: string[];
  deleteSql: string;
  deleteParams: (sp: URLSearchParams) => unknown[];
  deletePKs: string[];
}> = {

  // ----- Q1/Q2/A1-A5: colleges -----
  colleges: {
    select: `SELECT college_id, name, campus, type, fscl, website_url
             FROM colleges ORDER BY college_id LIMIT ? OFFSET ?`,
    insert: `INSERT INTO colleges (college_id, name, campus, type, fscl, website_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.name, b.campus, b.type, b.fscl, b.website_url],
    insertRequired: ["college_id", "name", "type"],
    update: `UPDATE colleges SET name = ?, campus = ?, type = ?, fscl = ?, website_url = ?
             WHERE college_id = ?`,
    updateParams: (b) => [b.name, b.campus, b.type, b.fscl, b.website_url, b.college_id],
    updateRequired: ["college_id", "name", "type"],
    deleteSql: `DELETE FROM colleges WHERE college_id = ?`,
    deleteParams: (sp) => [sp.get("college_id")],
    deletePKs: ["college_id"],
  },

  // ----- Q1: location -----
  location: {
    select: `SELECT college_id, street, city, state, postal_code
             FROM location ORDER BY college_id LIMIT ? OFFSET ?`,
    insert: `INSERT INTO location (college_id, street, city, state, postal_code)
             VALUES (?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.street, b.city, b.state, b.postal_code],
    insertRequired: ["college_id", "city", "state", "postal_code"],
    update: `UPDATE location SET street = ?, city = ?, state = ?, postal_code = ?
             WHERE college_id = ?`,
    updateParams: (b) => [b.street, b.city, b.state, b.postal_code, b.college_id],
    updateRequired: ["college_id", "city", "state", "postal_code"],
    deleteSql: `DELETE FROM location WHERE college_id = ?`,
    deleteParams: (sp) => [sp.get("college_id")],
    deletePKs: ["college_id"],
  },

  // ----- Q5/Q6/Q7: departments -----
  departments: {
    select: `SELECT college_id, department_id, department_name
             FROM departments ORDER BY college_id, department_id LIMIT ? OFFSET ?`,
    insert: `INSERT INTO departments (college_id, department_id, department_name)
             VALUES (?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.department_id, b.department_name],
    insertRequired: ["college_id", "department_id", "department_name"],
    update: `UPDATE departments SET department_name = ?
             WHERE college_id = ? AND department_id = ?`,
    updateParams: (b) => [b.department_name, b.college_id, b.department_id],
    updateRequired: ["college_id", "department_id", "department_name"],
    deleteSql: `DELETE FROM departments WHERE college_id = ? AND department_id = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("department_id")],
    deletePKs: ["college_id", "department_id"],
  },

  // ----- Q1/Q2/Q6: programs -----
  programs: {
    select: `SELECT college_id, department_id, program_id, name, degree, type, length
             FROM programs ORDER BY college_id, department_id, program_id LIMIT ? OFFSET ?`,
    insert: `INSERT INTO programs (college_id, department_id, program_id, name, degree, type, length)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.department_id, b.program_id, b.name, b.degree, b.type, b.length],
    insertRequired: ["college_id", "department_id", "program_id", "name"],
    update: `UPDATE programs SET name = ?, degree = ?, type = ?, length = ?
             WHERE college_id = ? AND department_id = ? AND program_id = ?`,
    updateParams: (b) => [b.name, b.degree, b.type, b.length, b.college_id, b.department_id, b.program_id],
    updateRequired: ["college_id", "department_id", "program_id", "name"],
    deleteSql: `DELETE FROM programs WHERE college_id = ? AND department_id = ? AND program_id = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("department_id"), sp.get("program_id")],
    deletePKs: ["college_id", "department_id", "program_id"],
  },

  // ----- Q7: faculty -----
  faculty: {
    select: `SELECT email, first_name, last_name, teaching_year, phone_number, college_id, department_id
             FROM faculty ORDER BY last_name, first_name LIMIT ? OFFSET ?`,
    insert: `INSERT INTO faculty (email, first_name, last_name, teaching_year, phone_number, college_id, department_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.email, b.first_name, b.last_name, b.teaching_year, b.phone_number, b.college_id, b.department_id],
    insertRequired: ["email", "first_name", "last_name", "college_id", "department_id"],
    update: `UPDATE faculty SET first_name = ?, last_name = ?, teaching_year = ?, phone_number = ?, college_id = ?, department_id = ?
             WHERE email = ?`,
    updateParams: (b) => [b.first_name, b.last_name, b.teaching_year, b.phone_number, b.college_id, b.department_id, b.email],
    updateRequired: ["email", "first_name", "last_name", "college_id", "department_id"],
    deleteSql: `DELETE FROM faculty WHERE email = ?`,
    deleteParams: (sp) => [sp.get("email")],
    deletePKs: ["email"],
  },

  // ----- Q3: parking_permits -----
  parking_permits: {
    select: `SELECT college_id, permit, cost, rate
             FROM parking_permits ORDER BY college_id, permit LIMIT ? OFFSET ?`,
    insert: `INSERT INTO parking_permits (college_id, permit, cost, rate)
             VALUES (?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.permit, b.cost, b.rate],
    insertRequired: ["college_id", "permit", "cost"],
    update: `UPDATE parking_permits SET cost = ?, rate = ?
             WHERE college_id = ? AND permit = ?`,
    updateParams: (b) => [b.cost, b.rate, b.college_id, b.permit],
    updateRequired: ["college_id", "permit", "cost"],
    deleteSql: `DELETE FROM parking_permits WHERE college_id = ? AND permit = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("permit")],
    deletePKs: ["college_id", "permit"],
  },

  // ----- Q4: housing -----
  housing: {
    select: `SELECT college_id, building_name, address, units, is_on_campus
             FROM housing ORDER BY college_id, building_name LIMIT ? OFFSET ?`,
    insert: `INSERT INTO housing (college_id, building_name, address, units, is_on_campus)
             VALUES (?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.building_name, b.address, b.units, b.is_on_campus],
    insertRequired: ["college_id", "building_name", "address", "is_on_campus"],
    update: `UPDATE housing SET units = ?, is_on_campus = ?
             WHERE college_id = ? AND building_name = ? AND address = ?`,
    updateParams: (b) => [b.units, b.is_on_campus, b.college_id, b.building_name, b.address],
    updateRequired: ["college_id", "building_name", "address", "is_on_campus"],
    deleteSql: `DELETE FROM housing WHERE college_id = ? AND building_name = ? AND address = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("building_name"), sp.get("address")],
    deletePKs: ["college_id", "building_name", "address"],
  },

  // ----- A1: admission_statistics -----
  admission_statistics: {
    select: `SELECT college_id, year, applications_received, applications_admitted
             FROM admission_statistics ORDER BY college_id, year LIMIT ? OFFSET ?`,
    insert: `INSERT INTO admission_statistics (college_id, year, applications_received, applications_admitted)
             VALUES (?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.year, b.applications_received, b.applications_admitted],
    insertRequired: ["college_id", "year"],
    update: `UPDATE admission_statistics SET applications_received = ?, applications_admitted = ?
             WHERE college_id = ? AND year = ?`,
    updateParams: (b) => [b.applications_received, b.applications_admitted, b.college_id, b.year],
    updateRequired: ["college_id", "year"],
    deleteSql: `DELETE FROM admission_statistics WHERE college_id = ? AND year = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("year")],
    deletePKs: ["college_id", "year"],
  },

  // ----- A2: expenses -----
  expenses: {
    select: `SELECT college_id, year, resident_tuition, nonresident_tuition, books_supplies
             FROM expenses ORDER BY college_id, year LIMIT ? OFFSET ?`,
    insert: `INSERT INTO expenses (college_id, year, resident_tuition, nonresident_tuition, books_supplies)
             VALUES (?, ?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.year, b.resident_tuition, b.nonresident_tuition, b.books_supplies],
    insertRequired: ["college_id", "year", "resident_tuition", "nonresident_tuition"],
    update: `UPDATE expenses SET resident_tuition = ?, nonresident_tuition = ?, books_supplies = ?
             WHERE college_id = ? AND year = ?`,
    updateParams: (b) => [b.resident_tuition, b.nonresident_tuition, b.books_supplies, b.college_id, b.year],
    updateRequired: ["college_id", "year", "resident_tuition", "nonresident_tuition"],
    deleteSql: `DELETE FROM expenses WHERE college_id = ? AND year = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("year")],
    deletePKs: ["college_id", "year"],
  },

  // ----- A3: ethnicities -----
  ethnicities: {
    select: `SELECT college_id, year, ethnicity, percent_enrolled
             FROM ethnicities ORDER BY college_id, year, ethnicity LIMIT ? OFFSET ?`,
    insert: `INSERT INTO ethnicities (college_id, year, ethnicity, percent_enrolled)
             VALUES (?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.year, b.ethnicity, b.percent_enrolled],
    insertRequired: ["college_id", "year", "ethnicity", "percent_enrolled"],
    update: `UPDATE ethnicities SET percent_enrolled = ?
             WHERE college_id = ? AND year = ? AND ethnicity = ?`,
    updateParams: (b) => [b.percent_enrolled, b.college_id, b.year, b.ethnicity],
    updateRequired: ["college_id", "year", "ethnicity", "percent_enrolled"],
    deleteSql: `DELETE FROM ethnicities WHERE college_id = ? AND year = ? AND ethnicity = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("year"), sp.get("ethnicity")],
    deletePKs: ["college_id", "year", "ethnicity"],
  },

  // ----- A4: gender -----
  gender: {
    select: `SELECT college_id, year, gender, percent_enrolled
             FROM gender ORDER BY college_id, year, gender LIMIT ? OFFSET ?`,
    insert: `INSERT INTO gender (college_id, year, gender, percent_enrolled)
             VALUES (?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.year, b.gender, b.percent_enrolled],
    insertRequired: ["college_id", "year", "gender", "percent_enrolled"],
    update: `UPDATE gender SET percent_enrolled = ?
             WHERE college_id = ? AND year = ? AND gender = ?`,
    updateParams: (b) => [b.percent_enrolled, b.college_id, b.year, b.gender],
    updateRequired: ["college_id", "year", "gender", "percent_enrolled"],
    deleteSql: `DELETE FROM gender WHERE college_id = ? AND year = ? AND gender = ?`,
    deleteParams: (sp) => [sp.get("college_id"), sp.get("year"), sp.get("gender")],
    deletePKs: ["college_id", "year", "gender"],
  },

  // ----- A5: walkscore_stats -----
  walkscore_stats: {
    select: `SELECT college_id, walk, transit, bike
             FROM walkscore_stats ORDER BY college_id LIMIT ? OFFSET ?`,
    insert: `INSERT INTO walkscore_stats (college_id, walk, transit, bike)
             VALUES (?, ?, ?, ?)`,
    insertParams: (b) => [b.college_id, b.walk, b.transit, b.bike],
    insertRequired: ["college_id"],
    update: `UPDATE walkscore_stats SET walk = ?, transit = ?, bike = ?
             WHERE college_id = ?`,
    updateParams: (b) => [b.walk, b.transit, b.bike, b.college_id],
    updateRequired: ["college_id"],
    deleteSql: `DELETE FROM walkscore_stats WHERE college_id = ?`,
    deleteParams: (sp) => [sp.get("college_id")],
    deletePKs: ["college_id"],
  },
};

// ============================================================
// Route handlers
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!isTableKey(table)) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const t = TABLES[table];

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1), 1000);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(t.select, [limit, offset]);
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!isTableKey(table)) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const t = TABLES[table];

  try {
    const body = await req.json();
    const missing = requireFields(body, t.insertRequired);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    const outOfRange = validateBounds(table, body);
    if (outOfRange) return NextResponse.json({ error: outOfRange }, { status: 400 });

    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(t.insert, t.insertParams(body));
    return NextResponse.json({ affectedRows: result.affectedRows, insertId: result.insertId }, { status: 201 });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!isTableKey(table)) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const t = TABLES[table];

  try {
    const body = await req.json();
    const missing = requireFields(body, t.updateRequired);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });
    const outOfRange = validateBounds(table, body);
    if (outOfRange) return NextResponse.json({ error: outOfRange }, { status: 400 });

    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(t.update, t.updateParams(body));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ affectedRows: result.affectedRows });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  if (!isTableKey(table)) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const t = TABLES[table];

  try {
    const url = new URL(req.url);
    const missing = requireParams(url.searchParams, t.deletePKs);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });

    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(t.deleteSql, t.deleteParams(url.searchParams));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ affectedRows: result.affectedRows });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
