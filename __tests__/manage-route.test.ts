import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the database pool
const mockQuery = vi.fn();
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: mockQuery }),
}));

// Import after mocking
const { GET, POST, PUT, DELETE: DELETE_HANDLER } = await import(
  "@/app/api/manage/[table]/route"
);

function makeRequest(url: string, init?: RequestInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(url, init as any);
}

function makeParams(table: string) {
  return { params: Promise.resolve({ table }) };
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /api/manage/[table]", () => {
  it("returns 404 for unknown table", async () => {
    const req = makeRequest("http://localhost/api/manage/fake_table");
    const res = await GET(req, makeParams("fake_table"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Unknown table");
  });

  it("returns rows for a valid table", async () => {
    const fakeRows = [{ college_id: 1, permit: "A", cost: 100, rate: "Quarterly" }];
    mockQuery.mockResolvedValueOnce([fakeRows]);

    const req = makeRequest("http://localhost/api/manage/parking_permits");
    const res = await GET(req, makeParams("parking_permits"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeRows);
    expect(mockQuery).toHaveBeenCalledOnce();
  });

  it("returns 500 on database error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection failed"));

    const req = makeRequest("http://localhost/api/manage/colleges");
    const res = await GET(req, makeParams("colleges"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/manage/[table]", () => {
  it("returns 404 for unknown table", async () => {
    const req = makeRequest("http://localhost/api/manage/nope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("nope"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest("http://localhost/api/manage/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus: "Test" }), // missing college_id, name, type
    });
    const res = await POST(req, makeParams("colleges"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("inserts a valid row and returns 201", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1, insertId: 5 }]);

    const req = makeRequest("http://localhost/api/manage/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 5,
        name: "Test University",
        type: "4-year",
      }),
    });
    const res = await POST(req, makeParams("colleges"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.affectedRows).toBe(1);
  });

  it("returns 409 with clear message on duplicate entry", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Duplicate entry '1' for key"));

    const req = makeRequest("http://localhost/api/manage/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 1,
        name: "Dup",
        type: "4-year",
      }),
    });
    const res = await POST(req, makeParams("colleges"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("A record with this key already exists");
  });
});

describe("PUT /api/manage/[table]", () => {
  it("returns 404 for unknown table", async () => {
    const req = makeRequest("http://localhost/api/manage/nope", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await PUT(req, makeParams("nope"));
    expect(res.status).toBe(404);
  });

  it("updates a row successfully", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const req = makeRequest("http://localhost/api/manage/parking_permits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 1,
        permit: "Court 17",
        cost: 275.00,
        rate: "Quarterly",
      }),
    });
    const res = await PUT(req, makeParams("parking_permits"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.affectedRows).toBe(1);
  });

  it("returns 404 when row not found", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const req = makeRequest("http://localhost/api/manage/parking_permits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 999,
        permit: "Nonexistent",
        cost: 100,
        rate: "Daily",
      }),
    });
    const res = await PUT(req, makeParams("parking_permits"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/manage/[table]", () => {
  it("returns 404 for unknown table", async () => {
    const req = makeRequest("http://localhost/api/manage/nope?id=1", {
      method: "DELETE",
    });
    const res = await DELETE_HANDLER(req, makeParams("nope"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when PK params are missing", async () => {
    const req = makeRequest("http://localhost/api/manage/parking_permits", {
      method: "DELETE",
    });
    const res = await DELETE_HANDLER(req, makeParams("parking_permits"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing required params");
  });

  it("deletes a row successfully", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const req = makeRequest(
      "http://localhost/api/manage/parking_permits?college_id=1&permit=Court%2017",
      { method: "DELETE" }
    );
    const res = await DELETE_HANDLER(req, makeParams("parking_permits"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.affectedRows).toBe(1);
  });

  it("returns 404 when row not found", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const req = makeRequest(
      "http://localhost/api/manage/parking_permits?college_id=999&permit=Nope",
      { method: "DELETE" }
    );
    const res = await DELETE_HANDLER(req, makeParams("parking_permits"));
    expect(res.status).toBe(404);
  });
});

describe("Pagination", () => {
  it("GET passes LIMIT and OFFSET to query", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const req = makeRequest("http://localhost/api/manage/colleges?limit=10&offset=20");
    await GET(req, makeParams("colleges"));

    const params = mockQuery.mock.calls[0][1] as number[];
    expect(params).toEqual([10, 20]);
  });

  it("GET caps limit at 1000", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const req = makeRequest("http://localhost/api/manage/colleges?limit=5000");
    await GET(req, makeParams("colleges"));

    const params = mockQuery.mock.calls[0][1] as number[];
    expect(params[0]).toBe(1000);
  });
});

describe("Explicit SQL", () => {
  it("POST passes correct params for insert", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1, insertId: 10 }]);

    const req = makeRequest("http://localhost/api/manage/parking_permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 1,
        permit: "Night Permit",
        cost: 50,
        rate: "Quarterly",
      }),
    });
    await POST(req, makeParams("parking_permits"));

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO parking_permits");
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toEqual([1, "Night Permit", 50, "Quarterly"]);
  });

  it("PUT passes correct params for update", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const req = makeRequest("http://localhost/api/manage/parking_permits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        college_id: 1,
        permit: "Court 17",
        cost: 300,
        rate: "Quarterly",
      }),
    });
    await PUT(req, makeParams("parking_permits"));

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("UPDATE parking_permits");
    expect(sql).toContain("WHERE college_id = ? AND permit = ?");
    const params = mockQuery.mock.calls[0][1] as unknown[];
    // SET cost = ?, rate = ? WHERE college_id = ? AND permit = ?
    expect(params).toEqual([300, "Quarterly", 1, "Court 17"]);
  });

  it("DELETE passes correct params", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const req = makeRequest(
      "http://localhost/api/manage/programs?college_id=1&department_id=1&program_id=1",
      { method: "DELETE" }
    );
    await DELETE_HANDLER(req, makeParams("programs"));

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("DELETE FROM programs");
    expect(sql).toContain("WHERE college_id = ? AND department_id = ? AND program_id = ?");
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toEqual(["1", "1", "1"]);
  });
});
