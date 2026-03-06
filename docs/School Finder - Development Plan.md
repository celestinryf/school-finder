# School Finder - Development Plan (POC)

Proof of concept: demonstrate that the normalized database works with a web UI. All 12 queries (7 scenario + 5 analytical) exposed via API routes with a functional frontend.

**Scope:** Working demo, not production. No tests, no Cloudflare, no typed error classes, no Zod validation, no performance optimization. Just a Next.js app that connects to MySQL, runs the queries, and displays results.

**Timeline:** 1 day

---

## Phase 1: Scaffold (~1 hour)

### Step 1: Initialize Next.js + Install Dependencies
- `npx create-next-app@latest` with TypeScript, App Router, Tailwind
- `npm install mysql2`
- Add `.env.local` with TiDB Serverless connection details
- Add `.env.example` as template
- Add `sql/` directory with the original SQL script
- Verify `npm run dev` works
- **Branch:** `feat/scaffold`, push, PR

### Step 2: Database Connection Pool
- Create `lib/db.ts` — singleton pool using `mysql2/promise`
- One file, ~20 lines. No abstraction beyond `getPool()`
- Test the connection by hitting Railway from a temp API route
- **Commit to same branch**

---

## Phase 2: API Routes (~3 hours)

All routes in `app/api/`. Simple pattern: get params, run parameterized SQL, return JSON. Basic try/catch with generic error response.

### Step 3: College Search Routes
- `GET /api/colleges` — list all colleges (joins location + walkscore)
- `GET /api/colleges/search` — Query 1: colleges in area with programs (params: state, excludeCity)
- `GET /api/colleges/search-program` — Query 2: colleges with a program (params: keyword)
- **Branch:** `feat/api-colleges`, push, PR

### Step 4: College Detail Routes
- `GET /api/colleges/[id]` — single college with location + walkscore
- `GET /api/colleges/[id]/departments` — Query 5
- `GET /api/colleges/[id]/programs` — Query 6 (params: departmentId, degree)
- `GET /api/colleges/[id]/faculty` — Query 7 (params: departmentId, lastNamePrefix)
- `GET /api/colleges/[id]/parking` — Query 3 (params: maxCost)
- `GET /api/colleges/[id]/housing` — Query 4

### Step 5: Analytics Routes
- `GET /api/analytics/acceptance-rate` — Query A1 (params: collegeId)
- `GET /api/analytics/tuition-gap` — Query A2
- `GET /api/analytics/demographics` — Query A3 (params: collegeId)
- `GET /api/analytics/gender` — Query A4 (params: collegeId)
- `GET /api/analytics/walkable` — Query A5
- **Branch:** `feat/api-analytics`, push, PR

---

## Phase 3: Frontend (~3 hours)

Server Components for pages. Client Components only for search inputs. Tailwind for basic styling. Functional, not pretty.

### Step 6: Home Page — College List + Search
- `app/page.tsx` — displays all colleges as cards
- Search bar for program keyword search
- State filter
- Each card links to `/colleges/[id]`

### Step 7: College Detail Page
- `app/colleges/[id]/page.tsx`
- Sections: overview, departments, programs, faculty, parking, housing
- Faculty search by last name
- Parking filter by max cost
- All data fetched server-side via internal API calls or direct DB queries

### Step 8: Analytics Page
- `app/analytics/page.tsx`
- Displays all 5 analytical queries as tables
- Acceptance rate, tuition gap, demographics, gender, walkability
- **Branch:** `feat/frontend`, push, PR

---

## Phase 4: Deploy (~30 min)

### Step 9: Vercel Deployment
- Push main to GitHub
- Connect to Vercel
- Set environment variables (DATABASE_HOST, etc.)
- Verify all pages work on production URL
- Update README with live URL

---

## Summary

| Phase | Steps | Time | What's Working |
|-------|-------|------|---------------|
| 1. Scaffold | 1-2 | ~1 hr | Next.js app connected to TiDB Serverless ✅ |
| 2. API Routes | 3-5 | ~3 hrs | All 12 queries accessible via REST ✅ |
| 3. Frontend | 6-8 | ~3 hrs | Search, detail, and analytics pages ✅ |
| 4. Deploy | 9 | ~30 min | Live on Vercel ✅ |
| **Total** | **9** | **~7 hrs** | **Full POC** |
