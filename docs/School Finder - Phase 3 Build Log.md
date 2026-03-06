# School Finder - Phase 3 Build Log

Detailed record of Phase 3 (Frontend) implementation.

**Date:** 2026-03-05
**Branch:** `feat/frontend`
**Starting state:** Phase 2 complete — all 12 API routes on `main`

---

## Architecture Decisions

Three decisions were made before coding:

1. **Data fetching: Direct DB queries** — Pages use `getPool()` directly in Server Components. Since Server Components run on the server (never in the browser), this is equivalent to an API route querying the DB — same security. Avoids the HTTP roundtrip of fetching our own API routes. API routes remain available for external consumers.

2. **Client component boundaries: Thin wrappers** — Only search/filter inputs are Client Components (`"use client"`). They update URL search params, which triggers a re-render of the Server Component parent with the new params. Minimal client-side JavaScript.

3. **Navigation: Simple nav bar in layout.tsx** — Header with links to Home and Analytics. College detail pages linked from home page cards.

---

## Step 1: Navigation Bar (`app/layout.tsx`)

Added a `<nav>` element to the root layout with:
- "School Finder" logo/link (left, links to `/`)
- "Home" and "Analytics" links (right)
- Wrapped `{children}` in a `<main>` with max-width constraint

---

## Step 2: Client Components

Created three thin client components in `components/`:

### `SearchForm.tsx`
- Program keyword search for the home page
- Reads/writes `keyword` URL search param
- Clear button appears when a search is active

### `ParkingFilter.tsx`
- Max cost filter for parking permits on college detail page
- Reads/writes `maxCost` URL search param

### `FacultySearch.tsx`
- Last name prefix + department dropdown filters for faculty directory
- Accepts `departments` prop to render a `<select>` with human-readable names
- Reads/writes `lastNamePrefix` and `departmentId` URL search params

All three use the same pattern: `useRouter` + `useSearchParams` to push URL updates, which re-renders the Server Component parent with new data.

---

## Step 3: Home Page (`app/page.tsx`)

Replaced the default Next.js page with:
- **College cards** — Grid of all colleges with name, campus, location, walkscore. Each links to `/colleges/[id]`.
- **Program search** — `SearchForm` component. When a keyword is provided, runs Q2 (program search) and shows results in a table above the college grid.
- Data fetching: two direct DB queries (`getColleges()` and `searchPrograms()`)

---

## Step 4: College Detail Page (`app/colleges/[id]/page.tsx`)

Single page with all college data in sections:
- **Overview** — Name, campus, address, type, website, walkscore, phone numbers
- **Departments** — Displayed as badge chips
- **Programs** — Table with program name, degree, type, department
- **Parking Permits** — Table with `ParkingFilter` component. Filterable by max cost.
- **Housing** — Table with building name, address, units, on-campus status
- **Faculty Directory** — Table with `FacultySearch` component. Filterable by last name prefix and department.

Uses a `Section` helper component (server-side) to reduce heading/layout repetition.

All data fetched in parallel via direct DB queries. Uses `notFound()` for invalid college IDs.

---

## Step 5: Analytics Page (`app/analytics/page.tsx`)

Displays all 5 analytical queries as tables:
- A1: Acceptance Rate Trends
- A2: Tuition Gap (Nonresident - Resident)
- A3: Diversity Composition
- A4: Gender Distribution
- A5: Highly Walkable & Transit-Accessible Colleges

No interactivity needed — pure Server Component. Uses an `AnalyticsSection` helper for consistent layout.

---

## Bug Fixes (user-modified API routes)

Two API route files had been modified by the user with input validation, but the changes referenced `NextResponse` without importing it:

1. `app/api/colleges/search/route.ts` — Added `NextResponse` import
2. `app/api/colleges/search-program/route.ts` — Added `NextResponse` import
3. `app/api/colleges/[id]/departments/route.ts` — Restored missing `const { id } = await params;`

---

## Greptile Review Fixes (PR #3)

Greptile flagged several issues across two review rounds. All fixed:

### Round 1
1. **Departments route validation** — Restored `Number.isInteger` + positive check on `collegeId` in `app/api/colleges/[id]/departments/route.ts` (accidentally removed during bug fix)
2. **Analytics parallel queries** — Changed 5 sequential `await pool.query()` calls to `Promise.all` in `app/analytics/page.tsx`
3. **Empty-state guards** — Wrapped Tuition Gap (A2) and Demographics (A3) table sections with `length > 0` checks, matching A1/A4/A5

### Round 2
4. **College detail parallel queries** — Changed 6 sequential `await pool.query()` calls to `Promise.all` in `app/colleges/[id]/page.tsx`
5. **NaN guards** — Added `Number.isFinite()` checks on `maxCost` and `departmentId` URL params to prevent `NaN` from corrupting SQL filter logic (e.g., `?maxCost=abc` now falls back to `null` instead of passing `NaN`)
6. **Department dropdown** — Replaced raw `<input type="number">` for department ID with a `<select>` dropdown in `FacultySearch.tsx`, populated from already-fetched departments data

---

## Build Verification

All pages and routes compile successfully:

```text
Route (app)
├ f /                           (Home, dynamic - search params)
├ o /analytics                  (Analytics, static)
├ f /colleges/[id]              (College detail, dynamic)
├ f /api/...                    (15 API routes)
```

---

## Files Created

```text
components/SearchForm.tsx       # Client: program keyword search
components/ParkingFilter.tsx    # Client: parking max cost filter
components/FacultySearch.tsx    # Client: faculty name/dept search
app/colleges/[id]/page.tsx      # College detail page
app/analytics/page.tsx          # Analytics dashboard
```

## Files Modified

```text
app/layout.tsx                  # Added nav bar + main wrapper
app/page.tsx                    # Replaced default with college list + search
app/api/colleges/search/route.ts          # Added NextResponse import
app/api/colleges/search-program/route.ts  # Added NextResponse import
app/api/colleges/[id]/departments/route.ts # Fixed params destructuring
```

---

## Related Documents

- [[School Finder - Development Plan]] — This is Phase 3 of 4
- [[School Finder - Phase 2 Build Log]] — Previous phase
- [[School Finder - Phase 1 Build Log]] — Initial scaffold
- [[School Finder Project]] — Project overview
