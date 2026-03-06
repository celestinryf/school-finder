# School Finder - Phase 2 Build Log

Detailed record of Phase 2 (API Routes) implementation.

**Date:** 2026-03-05
**Branch:** `feat/api-routes`
**Starting state:** Phase 1 complete — Next.js scaffold with TiDB connection pool and health endpoint on `main`

---

## Step 1: Create Shared API Helper (`lib/api.ts`)

**Decision:** All 13 API routes share the same pattern: get pool, run query, return JSON, catch errors. Rather than repeating this try/catch + error sanitization 13 times, we created a `queryHandler` wrapper.

**Implementation:**

- `queryHandler(fn)` accepts an async function that receives the pool and returns rows
- Wraps in try/catch with the same error sanitization pattern from the health route
- Returns `NextResponse.json(rows)` on success, `{ error: message }` on failure
- Uses `RowDataPacket` type from mysql2 for proper typing

**Trade-off:** This is a small abstraction, but it eliminates 13x duplication of error handling code (aligns with DRY preference). The function is simple enough (~15 lines) that it doesn't obscure what's happening.

---

## Step 2: College List Route (`GET /api/colleges`)

**Implementation:** Lists all colleges with location and walkscore data via LEFT JOINs.

**Design choice:** LEFT JOIN (not INNER JOIN) for location and walkscore so colleges still appear even if they're missing location/walkscore data. This is defensive — handles incomplete data gracefully.

---

## Step 3: College Search Routes (Q1, Q2)

### Q1: `GET /api/colleges/search?state=WA&excludeCity=Seattle`

Finds colleges in a particular area with their programs. Parameters:

- `state` (default: "WA") — required state filter
- `excludeCity` (optional) — exclude a specific city

The original SQL used implicit joins (`FROM colleges, programs, location WHERE ...`). We converted to explicit `JOIN` syntax for clarity while preserving the same logic.

### Q2: `GET /api/colleges/search-program?keyword=Computer`

Searches for colleges offering a program matching a keyword. Uses `LIKE %keyword%` with parameterized query (no SQL injection risk — the `%` wrapping happens in JavaScript, the value is passed as a parameter).

---

## Step 4: College Detail Routes (Q3-Q7)

All routes use `[id]` dynamic segment for `college_id`. Next.js 16 passes params as a Promise, so we `await params` in each handler.

### Q3: `GET /api/colleges/[id]/parking?maxCost=300`

Parking permits with optional max cost filter. Uses `? IS NULL OR pp.cost <= ?` pattern to make the filter optional.

### Q4: `GET /api/colleges/[id]/housing`

Housing options sorted by on-campus status (on-campus first).

### Q5: `GET /api/colleges/[id]/departments`

Lists departments/schools ordered by department_id.

### Q6: `GET /api/colleges/[id]/programs?departmentId=5&degree=Bachelors`

Programs with optional filters for department and degree. Both filters use the `? IS NULL OR column = ?` pattern.

### Q7: `GET /api/colleges/[id]/faculty?departmentId=5&lastNamePrefix=Ch`

Faculty directory search with optional department and last name prefix filters. The prefix uses `LIKE ?%` for starts-with matching.

---

## Step 5: Analytics Routes (A1-A5)

### A1: `GET /api/analytics/acceptance-rate?collegeId=1`

Acceptance rate trend with calculated `acceptance_rate_pct`. Uses `NULLIF` to prevent division by zero.

### A2: `GET /api/analytics/tuition-gap`

Tuition gap (nonresident minus resident) across all colleges. No parameters — shows all data.

### A3: `GET /api/analytics/demographics?collegeId=1`

Ethnicity breakdown with optional college filter. Sorted by percent_enrolled descending.

### A4: `GET /api/analytics/gender?collegeId=1`

Gender distribution using CASE/SUM pivot to produce female_pct, male_pct, other_pct columns.

### A5: `GET /api/analytics/walkable`

Colleges with walk score > 70 AND transit score > 70. No parameters.

---

## Step 6: SSL Type Fix in `lib/db.ts`

**Issue:** The build failed because `ssl: false` doesn't match mysql2's `SslOptions` type. The user had added `DATABASE_SSL === "false" ? false : { rejectUnauthorized: true }` to allow disabling SSL for local development.

**Fix:** Changed `false` to `undefined` which is accepted by the type system and effectively disables SSL.

---

## Build Verification

All 15 routes (+ static pages) compile and are recognized by Next.js:

```text
Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /api/analytics/acceptance-rate
├ ƒ /api/analytics/demographics
├ ƒ /api/analytics/gender
├ ƒ /api/analytics/tuition-gap
├ ƒ /api/analytics/walkable
├ ƒ /api/colleges
├ ƒ /api/colleges/[id]/departments
├ ƒ /api/colleges/[id]/faculty
├ ƒ /api/colleges/[id]/housing
├ ƒ /api/colleges/[id]/parking
├ ƒ /api/colleges/[id]/programs
├ ƒ /api/colleges/search
├ ƒ /api/colleges/search-program
└ ƒ /api/health
```

---

## Files Created

```text
lib/api.ts                                    # Shared queryHandler wrapper
app/api/colleges/route.ts                     # List all colleges
app/api/colleges/search/route.ts              # Q1: Colleges in area
app/api/colleges/search-program/route.ts      # Q2: Colleges with program
app/api/colleges/[id]/parking/route.ts        # Q3: Parking permits
app/api/colleges/[id]/housing/route.ts        # Q4: Housing options
app/api/colleges/[id]/departments/route.ts    # Q5: Departments
app/api/colleges/[id]/programs/route.ts       # Q6: Programs
app/api/colleges/[id]/faculty/route.ts        # Q7: Faculty directory
app/api/analytics/acceptance-rate/route.ts    # A1: Acceptance rate
app/api/analytics/tuition-gap/route.ts        # A2: Tuition gap
app/api/analytics/demographics/route.ts       # A3: Demographics
app/api/analytics/gender/route.ts             # A4: Gender distribution
app/api/analytics/walkable/route.ts           # A5: Walkable colleges
```

## Files Modified

```text
lib/db.ts    # SSL type fix: false → undefined
```

---

## Related Documents

- [[School Finder - Development Plan]] — This is Phase 2 of 4
- [[School Finder - Phase 1 Build Log]] — Previous phase
- [[School Finder - Architecture Decisions]] — Why raw SQL, why REST API routes
- [[School Finder Project]] — Project overview
