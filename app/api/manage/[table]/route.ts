import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { TABLE_MAP } from "@/lib/table-config";
import type { ColumnDef } from "@/lib/table-config";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

function getTableDef(tableKey: string) {
  const def = TABLE_MAP.get(tableKey);
  if (!def) return null;
  return def;
}

function parseValue(col: ColumnDef, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") {
    return col.required ? undefined : null;
  }
  const str = String(raw);
  switch (col.type) {
    case "int":
    case "tinyint": {
      const n = Number(str);
      if (!Number.isFinite(n) || n !== Math.floor(n)) return undefined;
      if (col.min !== undefined && n < col.min) return undefined;
      if (col.max !== undefined && n > col.max) return undefined;
      return n;
    }
    case "decimal": {
      const n = Number(str);
      if (!Number.isFinite(n)) return undefined;
      if (col.min !== undefined && n < col.min) return undefined;
      if (col.max !== undefined && n > col.max) return undefined;
      return n;
    }
    case "date":
    case "varchar":
      return str;
  }
}

function validateBody(columns: ColumnDef[], body: Record<string, unknown>, pkOnly: boolean) {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const col of columns) {
    if (pkOnly && !col.pk) continue;
    const raw = body[col.name];
    if ((raw === null || raw === undefined || raw === "") && col.required) {
      if (pkOnly && !col.pk) continue;
      errors.push(`${col.label} is required`);
      continue;
    }
    if (raw === null || raw === undefined || raw === "") {
      values[col.name] = null;
      continue;
    }
    const parsed = parseValue(col, raw);
    if (parsed === undefined) {
      errors.push(`${col.label} has an invalid value`);
      continue;
    }
    values[col.name] = parsed;
  }
  return { values, errors };
}

// GET — list all rows for a table
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const def = getTableDef(table);
  if (!def) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  try {
    const pool = getPool();
    const colNames = def.columns.map((c) => c.name).join(", ");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${colNames} FROM ${def.table} ORDER BY ${def.columns[0].name}`
    );
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — insert a new row
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const def = getTableDef(table);
  if (!def) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  try {
    const body = await req.json();
    const { values, errors } = validateBody(def.columns, body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const pool = getPool();
    const cols = Object.keys(values);
    const placeholders = cols.map(() => "?").join(", ");
    const colList = cols.join(", ");
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO ${def.table} (${colList}) VALUES (${placeholders})`,
      cols.map((c) => values[c])
    );
    return NextResponse.json({ affectedRows: result.affectedRows, insertId: result.insertId }, { status: 201 });
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    const status = error instanceof Error && error.message.includes("Duplicate entry") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PUT — update a row (identified by PK columns in body)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const def = getTableDef(table);
  if (!def) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  try {
    const body = await req.json();
    const { values, errors } = validateBody(def.columns, body, false);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const pkCols = def.columns.filter((c) => c.pk);
    const nonPkCols = def.columns.filter((c) => !c.pk).map((c) => c.name).filter((n) => n in values);

    if (nonPkCols.length === 0) {
      return NextResponse.json({ error: "No non-PK columns to update" }, { status: 400 });
    }

    const setClause = nonPkCols.map((c) => `${c} = ?`).join(", ");
    const whereClause = pkCols.map((c) => `${c.name} = ?`).join(" AND ");
    const paramValues = [...nonPkCols.map((c) => values[c]), ...pkCols.map((c) => values[c.name])];

    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE ${def.table} SET ${setClause} WHERE ${whereClause}`,
      paramValues
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ affectedRows: result.affectedRows });
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete a row (PK columns sent as query params)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const def = getTableDef(table);
  if (!def) return NextResponse.json({ error: "Unknown table" }, { status: 404 });

  try {
    const url = new URL(req.url);
    const pkCols = def.columns.filter((c) => c.pk);
    const pkValues: unknown[] = [];

    for (const col of pkCols) {
      const raw = url.searchParams.get(col.name);
      if (raw === null || raw === "") {
        return NextResponse.json({ error: `Missing PK column: ${col.label}` }, { status: 400 });
      }
      const parsed = parseValue(col, raw);
      if (parsed === undefined) {
        return NextResponse.json({ error: `Invalid PK value: ${col.label}` }, { status: 400 });
      }
      pkValues.push(parsed);
    }

    const whereClause = pkCols.map((c) => `${c.name} = ?`).join(" AND ");
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM ${def.table} WHERE ${whereClause}`,
      pkValues
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ affectedRows: result.affectedRows });
  } catch (error: unknown) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
