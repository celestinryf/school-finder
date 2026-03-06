"use client";

import { useState, useEffect, useCallback } from "react";
import { TABLE_CONFIGS } from "@/lib/table-config";
import type { TableDef, ColumnDef } from "@/lib/table-config";

type Row = Record<string, unknown>;

export default function ManagePage() {
  const [selectedTable, setSelectedTable] = useState<TableDef>(TABLE_CONFIGS[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [showInsert, setShowInsert] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${selectedTable.key}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }
      const data = await res.json();
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch rows");
    } finally {
      setLoading(false);
    }
  }, [selectedTable.key]);

  useEffect(() => {
    fetchRows();
    setEditingRow(null);
    setShowInsert(false);
    setSuccess(null);
  }, [fetchRows]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleInsert(formData: Row) {
    setError(null);
    try {
      const res = await fetch(`/api/manage/${selectedTable.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Insert failed");
      }
      flash("Row inserted successfully");
      setShowInsert(false);
      fetchRows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Insert failed");
    }
  }

  async function handleUpdate(formData: Row) {
    setError(null);
    try {
      const res = await fetch(`/api/manage/${selectedTable.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      flash("Row updated successfully");
      setEditingRow(null);
      fetchRows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleDelete(row: Row) {
    if (!confirm("Are you sure you want to delete this row?")) return;
    setError(null);
    try {
      const pkCols = selectedTable.columns.filter((c) => c.pk);
      const params = new URLSearchParams();
      for (const col of pkCols) {
        params.set(col.name, String(row[col.name] ?? ""));
      }
      const res = await fetch(`/api/manage/${selectedTable.key}?${params}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      flash("Row deleted successfully");
      fetchRows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Manage Data</h1>
      <p className="mb-6 text-sm text-gray-600">
        Insert, update, and delete records across all scenario tables.
      </p>

      {/* Table selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABLE_CONFIGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelectedTable(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedTable.key === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-2 text-xs text-gray-400">
        Scenarios: {selectedTable.scenarios.join(", ")}
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => { setShowInsert(!showInsert); setEditingRow(null); }}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {showInsert ? "Cancel Insert" : "Insert New Row"}
        </button>
        <button
          onClick={fetchRows}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      {/* Insert form */}
      {showInsert && (
        <RowForm
          columns={selectedTable.columns}
          onSubmit={handleInsert}
          onCancel={() => setShowInsert(false)}
          submitLabel="Insert"
        />
      )}

      {/* Edit form */}
      {editingRow && (
        <RowForm
          columns={selectedTable.columns}
          initialValues={editingRow}
          onSubmit={handleUpdate}
          onCancel={() => setEditingRow(null)}
          submitLabel="Update"
          pkReadOnly
        />
      )}

      {/* Data table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                {selectedTable.columns.map((col) => (
                  <th key={col.name} className="px-3 py-2">{col.label}</th>
                ))}
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={selectedTable.columns.length + 1} className="px-3 py-4 text-center text-gray-400">
                    No rows found.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {selectedTable.columns.map((col) => (
                      <td key={col.name} className="px-3 py-2">
                        {formatCell(col, row[col.name])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingRow(row); setShowInsert(false); }}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(col: ColumnDef, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (col.type === "decimal") return Number(value).toFixed(2);
  if (col.type === "tinyint") return Number(value) === 1 ? "Yes" : "No";
  return String(value);
}

function RowForm({
  columns,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  pkReadOnly = false,
}: {
  columns: ColumnDef[];
  initialValues?: Row;
  onSubmit: (data: Row) => void;
  onCancel: () => void;
  submitLabel: string;
  pkReadOnly?: boolean;
}) {
  const [formData, setFormData] = useState<Row>(() => {
    const init: Row = {};
    for (const col of columns) {
      init[col.name] = initialValues?.[col.name] ?? "";
    }
    return init;
  });

  function handleChange(colName: string, value: string) {
    setFormData((prev) => ({ ...prev, [colName]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: Row = {};
    for (const col of columns) {
      const val = formData[col.name];
      cleaned[col.name] = val === "" ? null : val;
    }
    onSubmit(cleaned);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{submitLabel} Row</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => {
          const isReadOnly = pkReadOnly && col.pk;
          return (
            <div key={col.name}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {col.label}
                {col.required && <span className="ml-0.5 text-red-500">*</span>}
                {col.pk && <span className="ml-1 text-xs text-blue-500">(PK)</span>}
              </label>
              {col.type === "tinyint" ? (
                <select
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  disabled={isReadOnly}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-200"
                >
                  <option value="">—</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              ) : (
                <input
                  type={col.type === "int" || col.type === "decimal" ? "number" : "text"}
                  step={col.type === "decimal" ? "0.01" : undefined}
                  min={col.min}
                  max={col.max}
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  required={col.required}
                  readOnly={isReadOnly}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm read-only:bg-gray-200"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
