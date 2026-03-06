# School Finder - Complete Planning Summary

This document is an exhaustive record of every decision, trade-off, rejected alternative, and rationale from the planning phase of the School Finder project. It is intended to serve as a permanent reference so that any future development session has full context on why the project is built the way it is, what was considered, and what was deliberately left out.

---

## Table of Contents

- [[#1. Project Background and Origins]]
- [[#2. Database Foundation]]
- [[#3. Architecture Decisions (Issues 1-4)]]
- [[#4. Code Quality Decisions (Issues 5-8)]]
- [[#5. Testing Strategy Decisions (Issues 9-12)]]
- [[#6. Performance Decisions (Issues 13-16)]]
- [[#7. Project Structure]]
- [[#8. API Endpoint Design]]
- [[#9. Engineering Principles]]
- [[#10. Workflow and Deployment]]

---

## 1. Project Background and Origins

### Who

The School Finder project was created by **Celestin Ryf** and **Preston Sia** as part of a database course. The original deliverable was a normalized relational database with DDL (table creation), DML (data insertion), and a set of queries demonstrating various SQL capabilities. The project is now being extended with a full web-based user interface.

### What

School Finder is a college/university information lookup tool. Users can search for colleges by location, program offerings, and various attributes. The application surfaces detailed information about each college including academic programs, faculty directories, tuition costs, campus demographics, housing options, parking permits, walkability scores, scholarships, Greek life organizations, and athletic programs.

### The Original Database Project

The original SQL script (`ryf_celestin_and_sia_preston_queries.sql`) contains:

1. **Database creation** (`ryf_celestin_and_sia_preston_db`)
2. **18 normalized tables** with full DDL including primary keys, foreign keys, CHECK constraints, and UNIQUE constraints
3. **Seed data** for 3 University of Washington campuses (Tacoma, Bothell, Seattle)
4. **7 scenario queries** demonstrating practical search use cases
5. **5 analytical queries** demonstrating aggregate analysis and trend detection
6. **A normalization document** (PDF) explaining functional dependencies, normal form violations found, and how they were resolved

The normalization work was thorough. Notable decisions documented in the normalization PDF include:

- **greek_organizations**: The `council` column was removed as unnecessary. The functional dependency `college_id ->> name` (multivalued) was identified, and `(college_id, name) -> org_type` confirmed. Final relation: `R(college_id, name, org_type)`.
- **college_sports**: A 2nd normal form violation was identified where `college_id -> conference` and `college_id -> division` existed in a table with composite key `(college_id, sport_name, gender)`. This was decomposed into two tables: `college_sports(college_id, sport_name, gender)` and `college_conference(college_id, athletic_conference, division)`.
- **faculty**: After discussion, `email` was chosen as the primary key rather than a composite key. The FD `phone_number -> email` was noted but not enforced because the script had already been produced. The assumption is that only one email and one phone will be listed per faculty member, and faculty can share names.
- **programs**: `program_id` is NOT globally unique. All three columns `(college_id, department_id, program_id)` are required to uniquely identify a program.
- **location**: Although US postal codes can span multiple cities, counties, or states, the decision was made to keep `college_id` as the sole primary key since each college has one location.
- **departments**: Already in normalized form. `(college_id, department_id) -> department_name`.
- **sports**: Both `name` and `gender` together form the primary key. This is a standalone lookup table.

---

## 2. Database Foundation

### Schema Overview (18 Tables)

The database is centered around the `colleges` table. Every other table references `college_id` as a foreign key (except `sports`, which is a standalone lookup table referenced by `college_sports`).

#### Core Identity Tables

| Table | Primary Key | Description | Notable Constraints |
|-------|-------------|-------------|---------------------|
| `colleges` | `college_id` (AUTO_INCREMENT) | Central entity. Stores name, campus, type (e.g., "4-year"), FSCL code, website URL. | `UNIQUE(name, campus)` — allows same university name with different campuses (e.g., UW Seattle vs UW Bothell). `fscl` is deliberately NOT unique because UW Tacoma and UW Bothell share the same FSCL value. |
| `location` | `college_id` (FK) | One-to-one with colleges. Street address, city, state (2-char), postal code. | 1:1 relationship enforced by PK being the FK. |
| `college_phones` | `phone_number` | Phone numbers associated with a college. Multiple phones per college (main, admissions, safety). | Phone number itself is the PK, not an auto-increment. |

#### Academic Tables

| Table | Primary Key | Description | Notable Constraints |
|-------|-------------|-------------|---------------------|
| `departments` | `(college_id, department_id)` | Academic departments/schools within a college. | Composite PK because `department_id` is only unique within a college. |
| `faculty` | `email` | Faculty members. Stores name, teaching year, phone, linked to a department. | Email is the PK. FK to `departments(college_id, department_id)` with `ON DELETE RESTRICT` — you cannot delete a department that has faculty. |
| `programs` | `(college_id, department_id, program_id)` | Academic programs offered by a department. Name, degree level, type, length. | Triple composite PK because `program_id` is not globally unique. FK to departments with `ON DELETE CASCADE`. |

#### Statistics and Demographics Tables

| Table | Primary Key | Description | Notable Constraints |
|-------|-------------|-------------|---------------------|
| `admission_statistics` | `(college_id, year)` | Applications received and admitted per year. | CHECK: `applications_admitted <= applications_received`. Both must be positive if not NULL. |
| `expenses` | `(college_id, year)` | Tuition (resident and nonresident) and books/supplies costs per year. | All cost fields must be non-negative. `year` must be positive. |
| `ethnicities` | `(college_id, year, ethnicity)` | Percentage of students enrolled by ethnicity per year. | CHECK: `percent_enrolled BETWEEN 0 AND 100`. |
| `gender` | `(college_id, year, gender)` | Percentage of students enrolled by gender per year. | CHECK: `percent_enrolled BETWEEN 0 AND 100`. |

#### Campus Life Tables

| Table | Primary Key | Description | Notable Constraints |
|-------|-------------|-------------|---------------------|
| `housing` | `(college_id, building_name, address)` | Housing buildings. Units count, on/off campus flag. | Triple composite PK. `is_on_campus` constrained to 0 or 1. Units must be non-negative if present. |
| `parking_permits` | `(college_id, permit)` | Parking permit types with costs and rate periods. | Cost must be non-negative. |
| `walkscore_stats` | `college_id` (FK) | Walk, transit, and bike scores (0-100 scale). | Each score has a CHECK constraint for 0-100 range. 1:1 with colleges. |
| `scholarships` | `(college_id, scholarship_name)` | Scholarship offerings with average award amounts, residency requirements, types, and deadlines. | `avg_awards` must be non-negative if present. |
| `greek_organizations` | `(college_id, name)` | Greek life organizations with type classification. | Composite PK. Council column was removed during normalization. |

#### Athletics Tables

| Table | Primary Key | Description | Notable Constraints |
|-------|-------------|-------------|---------------------|
| `sports` | `(sport_name, gender)` | Standalone lookup table of sports. | No FK to colleges — this is a reference table. |
| `college_conference` | `college_id` (FK) | Athletic conference and division for a college. | 1:1 with colleges. Split from original college_sports to fix 2NF violation. |
| `college_sports` | `(college_id, sport_name, gender)` | Which sports a college offers. | FK to both `colleges` and `sports`. `ON DELETE RESTRICT` for sports (can't delete a sport that colleges offer). |

### Current Seed Data

The database is seeded with data for three University of Washington campuses:

**UW Tacoma (college_id: 1)**
- 3 departments (Engineering & Technology, Business, Interdisciplinary Arts & Sciences)
- 2 programs (Computer Science BS, Business Administration BA)
- 26 faculty members (the most of any campus in the seed data)
- 3 scholarships (Dressel Scholars, General Scholarship, First-Year Merit)
- Admission statistics for 2025 (3,161 received, 2,662 admitted = 84.2% acceptance rate)
- Expenses for 2025 ($13,581 resident, $45,111 nonresident)
- 6 ethnicity breakdowns, 2 gender breakdowns
- Walk score 84, bike score 62 (no transit score)
- 2 parking permits, 1 housing building (Court 17, 128 units)

**UW Bothell (college_id: 2)**
- 5 departments (Business, Educational Studies, Interdisciplinary Arts & Sciences, Nursing & Health Studies, STEM)
- 5 programs across multiple departments
- 8 faculty members (all in STEM)
- Expenses for 2026 ($13,472 resident, $44,706 nonresident)
- 7 ethnicity breakdowns (no gender data)
- Walk score 37, transit 52, bike 67
- 4 parking permits, 1 housing building (Residential Village)

**UW Seattle (college_id: 3)**
- 5 departments (Political Science, Atmospheric Sciences, Evans School, Economics, Psychology)
- 5 programs (one per department)
- 7 faculty members across 4 departments
- Big Ten Conference, NCAA Division I
- Expenses for 2026 ($13,406 resident, $44,640 nonresident)
- 9 ethnicity breakdowns (no gender data)
- Walk score 97, transit 83, bike 77
- 3 parking permits, 1 housing building (Lander Hall)
- 16 sports entries in the sports lookup table

### The 12 Queries

#### 7 Scenario Queries (User-Facing Search Patterns)

**Query 1: Colleges in a particular area with programs**
Joins `colleges`, `programs`, and `location`. Filters by state and excludes a specific city. This demonstrates geographic filtering combined with program information. In the seed data, it finds UW Tacoma and UW Bothell programs (excluding Seattle).

**Query 2: Search for a college with a particular program**
Joins `colleges` and `programs`. Uses `LIKE '%Computer%'` to find computer-related majors. This is a keyword search pattern that will map to the UI's program search feature.

**Query 3: Parking permits under a max cost**
Filters `parking_permits` for a specific college where cost is at or below a threshold ($300). Orders by cost ascending. A practical campus life query.

**Query 4: Housing options for a college**
Selects from `housing` for a specific college. Orders by `is_on_campus` descending (on-campus first), then by building name. Shows available living arrangements.

**Query 5: Departments for a college**
Simple select from `departments` filtered by `college_id`. Ordered by `department_id`. This is the entry point for browsing a college's academic structure.

**Query 6: Programs for a department with filters**
Filters `programs` by college, department, and optionally by degree level (e.g., Bachelors only). Demonstrates drill-down from department to specific programs.

**Query 7: Faculty directory search**
Searches `faculty` by college, department, and last name prefix (`LIKE 'Ch%'`). This is a directory-style lookup that will power the faculty search feature in the UI.

#### 5 Analytical Queries (Data Analysis Patterns)

**Query A1: Acceptance rate trend**
Calculates `100.0 * applications_admitted / NULLIF(applications_received, 0)` as `acceptance_rate_pct`. Uses `NULLIF` to prevent division by zero. Joins with colleges for context. This powers trend analysis over multiple years.

**Query A2: Tuition gap by year**
Computes `nonresident_tuition - resident_tuition` as `tuition_gap`. Orders by year descending and gap descending to show which colleges have the largest tuition differential. Useful for out-of-state cost analysis.

**Query A3: Diversity composition**
Selects ethnicity percentages ordered by enrollment percentage descending within each college-year. Shows the demographic breakdown of each campus, useful for students evaluating campus diversity.

**Query A4: Gender distribution pivot**
Uses `SUM(CASE WHEN ...)` to pivot the gender table into columns: `female_pct`, `male_pct`, `other_pct`. Groups by college and year. This is a classic SQL pivot pattern that produces a cleaner output than the raw normalized data.

**Query A5: Walkable and transit-accessible colleges**
Joins `colleges` with `walkscore_stats` and filters for `walk > 70 AND transit > 70`. Finds colleges that are both highly walkable and well-served by public transit. In the seed data, only UW Seattle qualifies (97 walk, 83 transit).

---

## 3. Architecture Decisions (Issues 1-4)

### Issue #1: Database Connection Strategy

**Decision: Raw mysql2 driver (no ORM)**

This was the first and most consequential architectural decision. Three options were evaluated:

**Option A (Prisma ORM) — Rejected.** Prisma would have provided type-safe queries, auto-generated migrations, and the ability to introspect the existing MySQL schema via `prisma db pull`. It is the most popular ORM in the Next.js ecosystem. However, it adds an abstraction layer, and the existing 12 SQL queries would need to be either rewritten in Prisma's query syntax or wrapped in `$queryRaw` calls. The analytical queries in particular (with their CASE WHEN pivots, NULLIF, and complex JOINs) would lose clarity when translated to ORM syntax.

**Option B (Raw mysql2) — Selected.** The `mysql2` package with its Promise-based API provides direct MySQL access. The existing SQL queries from the course project can be used nearly verbatim, which preserves the educational value and auditability of the code. The trade-off is that there is no type safety on query results (TypeScript types must be manually defined), no automatic migration tooling, and parameterized queries must be used diligently to prevent SQL injection. This trade-off was accepted because Zod validation at the API boundary (Issue #8) provides the input sanitization layer, and the mysql2 parameterized query syntax (`?` placeholders) handles SQL injection prevention.

**Option C (Drizzle ORM) — Rejected.** Drizzle sits between Prisma and raw SQL — it has a SQL-like syntax with type safety. It was rejected because it's a newer ecosystem with fewer learning resources, and the project already has working raw SQL queries that would need translation.

**Key implication:** Because there is no ORM providing a safety net, every other code quality decision downstream (Zod validation, centralized error handling, per-entity query modules) becomes more important. The raw mysql2 choice elevates the importance of discipline in query organization and input handling.

### Issue #2: API Architecture

**Decision: Next.js App Router + REST API routes**

Three patterns were evaluated for the API layer:

**Option A (App Router + REST) — Selected.** The Next.js App Router (introduced in Next.js 13+) is the current recommended approach by Vercel. REST endpoints map naturally to the college_id-centric schema. For example, `GET /api/colleges` lists colleges, `GET /api/colleges/1` gets a specific college, `GET /api/colleges/1/programs` lists that college's programs. This is intuitive, well-documented, and Vercel optimizes deployment specifically for App Router projects. The 12 existing queries map cleanly to approximately 7-8 REST endpoints.

**Option B (App Router + tRPC) — Rejected.** tRPC provides end-to-end type safety from the database layer through the API to the frontend, eliminating the need for an explicit API schema. However, its primary advantage is eliminating type mismatches in mutations (create, update, delete), and since this project has no authentication and is primarily read-only, tRPC's mutation safety is less valuable. The additional setup complexity and bundle size were not justified.

**Option C (Pages Router + REST) — Rejected.** The Pages Router is the legacy Next.js approach. While simpler conceptually, Vercel is investing all new features into the App Router. Using Pages Router would mean missing out on React Server Components, streaming, and other performance optimizations. It would also make the project feel dated to anyone reviewing it.

**Endpoint mapping from existing queries:**
- Query 1, 2 -> `GET /api/colleges` with query params for state, city, program search
- Query 3 -> `GET /api/colleges/:id/parking`
- Query 4 -> `GET /api/colleges/:id/housing`
- Query 5 -> `GET /api/colleges/:id/departments`
- Query 6 -> `GET /api/colleges/:id/programs`
- Query 7 -> `GET /api/colleges/:id/faculty`
- Queries A1-A5 -> `GET /api/colleges/:id/analytics` or individual analytics endpoints

### Issue #3: MySQL Hosting

**Decision: Railway (free tier)**

The production MySQL database needs a cloud host because Vercel's serverless functions can't run a local database.

**Option A (PlanetScale) — Rejected.** PlanetScale was previously the go-to MySQL host for Vercel projects due to its serverless architecture, database branching (which mirrors git branching), and zero-downtime migrations. However, PlanetScale removed its free tier in 2024 and now starts at $39/month. For a student project, this cost is not justified. PlanetScale would be the better choice if the project needed to scale significantly.

**Option B (Railway) — Selected.** Railway offers a free tier with standard MySQL 8, which is exactly what the existing SQL script targets. The setup is trivial — create a MySQL service, get a connection string, import the SQL script. Railway provides a web-based database GUI for inspection, and creating a second instance for testing is straightforward. The free tier has limited resources (likely 10-20 max connections, ~1GB storage), but for 3 colleges worth of data, this is more than sufficient.

**Option C (Self-hosted / Aiven) — Rejected.** Self-hosting MySQL (e.g., on a VPS or Docker in the cloud) introduces significant operational overhead: monitoring, backups, security patches, uptime management. Aiven has a limited free tier for MySQL but is less well-known. Neither option was justified for a student project.

**Important consideration for Railway:** The free tier's connection limit directly influenced the connection pool decision (Issue #6). Serverless functions on Vercel can open many concurrent connections during traffic spikes, and Railway's limit is low. The singleton pool pattern mitigates this.

### Issue #4: Cloudflare Integration Scope

**Decision: DNS + Proxy only (free tier), with option to upgrade later**

Cloudflare was specified as a requirement "for safety." The scope of integration needed definition.

**Option A (DNS + Proxy only) — Selected.** Pointing the domain's DNS to Cloudflare and enabling the proxy toggle provides: DDoS protection, automatic SSL/TLS, basic Web Application Firewall rules, and caching of static assets — all on the free tier, with zero configuration beyond the initial DNS setup. For a no-auth student project, this is proportionate security. The Cloudflare proxy sits between users and Vercel, filtering malicious traffic before it reaches the application.

**Option B (WAF + Rate Limiting + Bot Protection) — Deferred.** More aggressive Cloudflare features like custom WAF rules, rate limiting on specific API paths, and bot detection are available but require configuration and testing. Rate limiting is particularly relevant because the API is public (no auth), meaning anyone can hammer endpoints. This was deferred rather than rejected — the recommendation is to add rate limiting if the API sees unexpected traffic or abuse after launch.

**Option C (Cloudflare Workers at the edge) — Rejected.** Running application logic at Cloudflare's edge (e.g., rate limiting, request transformation) overlaps with Vercel's own middleware capabilities. Maintaining two edge runtimes adds complexity without clear benefit. If edge logic is needed, Vercel's `middleware.ts` is the better place for it since it's in the same codebase and deployment pipeline.

---

## 4. Code Quality Decisions (Issues 5-8)

### Issue #5: Database Query Organization

**Decision: Per-entity query modules in `lib/db/queries/`**

With raw mysql2 and 12+ queries, organization is critical to avoid duplication and maintain testability.

**Option A (Per-entity modules) — Selected.** Each domain entity gets its own file: `lib/db/queries/colleges.ts`, `lib/db/queries/programs.ts`, `lib/db/queries/faculty.ts`, `lib/db/queries/expenses.ts`, `lib/db/queries/demographics.ts`, etc. Each file exports named functions like `getCollegesByState(state: string, excludeCity?: string)`, `searchProgramsByKeyword(keyword: string)`, etc.

This pattern has several advantages that align with the project's engineering preferences:

- **DRY by default:** If two API routes need the same query (e.g., both the college list page and the college detail page need `getCollegeById`), the function exists in one place. Without this structure, the same SQL string would be duplicated across route handlers.
- **Independently testable:** Each query function can be unit-tested with a mocked pool or integration-tested against a real database, without needing to spin up an HTTP server.
- **Clear ownership:** When a query needs to change, you know exactly which file to edit. `expenses.ts` handles tuition queries, `demographics.ts` handles ethnicity and gender queries, etc.
- **Thin route handlers:** API route files become simple: validate input (Zod), call query function, format response, handle errors. No SQL strings cluttering the route logic.

**Option B (Inline in API routes) — Rejected.** Placing SQL strings directly in route handlers is the fastest to start but deteriorates quickly. Query 1 (`colleges in area + programs`) and Query 2 (`colleges with program`) both join `colleges` and `programs` with slight differences in WHERE clauses. Inline SQL would duplicate the JOIN logic across two route handlers, violating DRY immediately.

**Option C (Single queries file) — Rejected.** A monolithic `lib/db/queries.ts` containing all 12+ queries plus any new ones would grow unwieldy. With 5+ contributors or across time, merge conflicts become likely. Finding a specific query in a 500-line file is slower than navigating to the right domain file.

### Issue #6: Database Connection Pool Management

**Decision: Singleton pool with module-level caching**

In a serverless environment (Vercel), each function invocation could potentially create a new database connection. Without pooling, this would quickly exhaust Railway's connection limit.

**Option A (Singleton pool) — Selected.** The implementation is approximately 15 lines in `lib/db/pool.ts`. It uses `mysql2/promise`'s `createPool()` function and caches the pool instance in a module-level variable. When any query module calls `getPool()`, it either returns the existing pool or creates one. The pool manages connection lifecycle internally — borrowing connections for queries and returning them when done.

Key configuration values:
- `connectionLimit`: Should be set conservatively (e.g., 5-10) given Railway's free tier limits
- `waitForConnections`: `true` — queue requests when all connections are in use rather than failing
- `queueLimit`: 0 (unlimited queue, since we'd rather wait than error)

In Vercel's serverless model, a "warm" function instance reuses the module-level pool across multiple invocations. A "cold start" creates a new pool. This is acceptable because cold starts are infrequent and the pool correctly manages its connections.

**Option B (Per-request connection) — Rejected with emphasis.** Creating a new `mysql2.createConnection()` for every API request is the most common mistake in serverless MySQL applications. Each connection takes ~50-100ms to establish (TCP + MySQL handshake), and if two concurrent requests each create a connection, you're already at 2 of Railway's ~10 free connections. Under any real traffic, this exhausts the limit within seconds and causes all subsequent requests to fail with "Too many connections" errors.

**Option C (External connection pooler) — Rejected.** Tools like PgBouncer (for PostgreSQL) or ProxySQL (for MySQL) sit between the application and database, managing a pool of connections centrally. This is the correct solution at scale but requires additional infrastructure. For a student project with minimal concurrent users, the singleton pool pattern is sufficient.

### Issue #7: Error Handling Pattern

**Decision: Centralized error handler with typed error classes**

API error handling affects both security (no leaking internal details) and developer experience (consistent error formats).

**Option A (Centralized handler) — Selected.** The implementation lives in `lib/api/errors.ts` and consists of:

1. **Typed error classes:** `NotFoundError` (404), `ValidationError` (400), `DatabaseError` (500). Each extends a base `AppError` class with a `statusCode` property.
2. **`handleApiError(error: unknown)`** function that maps any caught error to a consistent JSON response: `{ error: string, status: number }`. If the error is an `AppError`, use its message and status code. If it's an unknown error, return a generic 500 without exposing internal details.

This pattern means every API route handler follows the same structure:
```
try {
  // validate, query, respond
} catch (error) {
  return handleApiError(error);
}
```

No SQL error messages, connection strings, or stack traces ever reach the client. This is particularly important because the API is public (no auth) and protected only by Cloudflare at the network level.

The error classes also make testing explicit: you can assert that a query for a nonexistent college ID throws `NotFoundError`, not a generic Error.

**Option B (Ad-hoc try/catch) — Rejected.** Each route handler doing its own error handling leads to inconsistency. One route might return `{ error: "Not found" }` while another returns `{ message: "College not found", code: 404 }`. Clients can't reliably parse errors. Additionally, a developer in a hurry might forget to catch database errors in one route, causing raw MySQL error messages (which include table names, column names, and potentially query structure) to leak to the client.

**Option C (Next.js middleware) — Rejected.** Next.js middleware in the App Router runs on the Edge runtime and executes before route handlers. It cannot catch errors thrown inside route handlers — it only processes the request/response before and after routing. It's the wrong tool for this job.

### Issue #8: Input Validation

**Decision: Zod schemas per route**

Input validation is the first line of defense at the application boundary, and it is especially critical given the raw mysql2 choice.

**Option A (Zod schemas) — Selected.** Zod is a TypeScript-first schema validation library. For each API endpoint, a Zod schema defines the expected shape and types of query parameters and request bodies. For example:

```typescript
// lib/validators/colleges.ts
const CollegeSearchParams = z.object({
  state: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  program: z.string().max(255).optional(),
});
```

When an API route receives a request, it runs the query parameters through the Zod schema before passing them to a query function. If validation fails, Zod provides a structured error message that the centralized error handler converts to a 400 response. If validation passes, the validated data is correctly typed in TypeScript.

**Why this is non-negotiable with raw mysql2:** Without an ORM, there is no intermediate layer validating that a `college_id` parameter is actually a number, or that a `state` parameter is actually a 2-character string. If raw, unvalidated user input reaches a SQL query, even with parameterized queries (`?` placeholders), unexpected types can cause cryptic MySQL errors or unexpected behavior. Zod ensures that by the time data reaches the query layer, it is the correct type and within acceptable bounds.

**Defense in depth:** The validation architecture is layered:
1. **Cloudflare** filters obviously malicious traffic (DDoS, known attack patterns)
2. **Zod** validates that inputs are the correct type, shape, and within bounds
3. **mysql2 parameterized queries** (`?` placeholders) prevent SQL injection even if Zod is somehow bypassed
4. **MySQL CHECK constraints** (already in the schema) provide a final database-level safety net

**Option B (Manual validation) — Rejected.** Writing `if (typeof state !== 'string' || state.length !== 2)` in every route handler is repetitive, error-prone (easy to forget a check), and produces inconsistent error messages. It also doesn't generate TypeScript types, so the validated data is still `unknown` or requires manual casting.

**Option C (No validation) — Rejected emphatically.** With raw SQL, no input validation means:
- A `college_id` of `"abc"` hits MySQL and produces a cryptic error that may leak table structure
- An extremely long string in a search parameter could cause performance issues
- Unexpected `null` or `undefined` values could produce wrong query results instead of errors
- While parameterized queries prevent SQL injection of the `'; DROP TABLE` variety, type mismatches and boundary violations are still problematic

---

## 5. Testing Strategy Decisions (Issues 9-12)

### Issue #9: Testing Framework

**Decision: Jest**

Three testing frameworks were evaluated for the project:

**Option A (Vitest) — Rejected (was recommended).** Vitest is the fastest-growing testing framework in the JavaScript ecosystem, with native ESM and TypeScript support, a Vite-based architecture for fast test runs, and an API nearly identical to Jest. It was recommended because it requires less configuration for Next.js App Router projects. However, the user chose Jest, which may reflect familiarity, course requirements, or preference for the more established ecosystem.

**Option B (Jest) — Selected.** Jest is the industry standard JavaScript testing framework. It has the largest ecosystem of matchers, plugins, and learning resources. The trade-off is that Jest requires more configuration for ESM/TypeScript projects, particularly with Next.js App Router. This means:
- A `jest.config.ts` file with `transform` settings for TypeScript (using `ts-jest` or `@swc/jest`)
- Possible `moduleNameMapper` configuration for path aliases
- ESM compatibility settings if using `import/export` syntax

Despite the configuration overhead, Jest's maturity means that nearly any testing pattern has an existing example or Stack Overflow answer. For a student project where learning resources matter, this is valuable.

**Option C (Node built-in test runner) — Rejected.** Node's built-in `node:test` module is zero-dependency but has no React Testing Library integration and a much smaller ecosystem. Inadequate for component testing or E2E.

### Issue #10: Test Layers

**Decision: 3-layer testing strategy (Unit + Integration + E2E)**

This decision directly reflects the engineering preference that "too many tests is better than too few."

**Unit tests (`__tests__/unit/`):** Test individual functions in isolation. Query functions are tested with a mocked database pool to verify they construct correct SQL and handle results properly. Zod validators are tested to verify they accept valid input and reject invalid input with appropriate errors. The error handler is tested to verify it maps error types to correct HTTP status codes. These tests run fast (milliseconds) and catch logic errors.

**Integration tests (`__tests__/integration/`):** Test the full request pipeline against a real MySQL database (the Railway dev instance). An API route receives an HTTP request, validates the input, executes a real SQL query against real data, and returns a formatted response. These tests catch: SQL syntax errors that mocks wouldn't find, connection pool issues, constraint violations, and data-dependent edge cases. They are slower (require network access to Railway) but provide the highest confidence that the application actually works.

**E2E tests (`__tests__/e2e/`):** Test user flows in a real browser using Playwright. A test might: navigate to the home page, type "Computer Science" in the search box, click search, verify that results appear for UW Tacoma and UW Bothell, click on UW Tacoma, and verify that the detail page shows the correct departments and programs. These tests catch UI rendering bugs, broken navigation, and integration issues between the frontend and API.

**Why all 3 layers are necessary for this project:**
- Raw SQL means unit tests with mocked DB give false confidence — the SQL might be syntactically wrong and tests would still pass. Integration tests are essential.
- A UI project without E2E tests means visual regressions and navigation bugs go undetected.
- Unit tests without integration tests mean the validation layer is tested but the query layer is not verified against real MySQL.

### Issue #11: Test Database Strategy

**Decision: Railway dev instance**

Integration tests need a real MySQL database. The strategy for provisioning and managing it matters.

**Option A (Docker MySQL) — Rejected (was recommended).** A `docker-compose.yml` with a MySQL 8 service and the existing SQL script as a seed would provide a fully reproducible, isolated test environment. Each test run would get a fresh database. GitHub Actions supports MySQL service containers natively. This was recommended because it is the most reliable approach. However, it requires Docker to be installed locally and adds complexity to the CI setup.

**Option B (Railway dev instance) — Selected.** A second Railway MySQL instance dedicated to testing. The existing SQL script is imported once to seed it. Tests run against this shared instance.

Trade-offs to be aware of with this choice:
- **Shared state:** If tests modify data (INSERT, UPDATE, DELETE), subsequent tests may see unexpected state. Mitigation: use transactions that roll back after each test, or re-seed before each test suite.
- **Network latency:** Tests are slower than a local Docker database because queries travel over the internet to Railway's servers. Typical latency: 20-100ms per query vs <1ms for local.
- **Parallel test safety:** Multiple developers or CI runs hitting the same test database simultaneously can cause flaky tests. Mitigation: use unique test data per run (e.g., prefixed college names) or serialize test runs.
- **Cost:** Railway's free tier applies across all instances, so the test database shares the free tier allocation with production.

**Option C (SQLite compatibility layer) — Rejected.** MySQL and SQLite have significant syntax differences: `AUTO_INCREMENT` vs `AUTOINCREMENT`, `TINYINT(1)` vs `INTEGER`, CHECK constraints behave differently, `LIKE` case sensitivity differs, and `DECIMAL` precision handling varies. Maintaining a compatibility layer would be an ongoing burden, and tests could pass on SQLite but fail on MySQL (false positives).

### Issue #12: Test Priority

**Decision: Inside-out — queries first, then API routes, then E2E**

The testing order was chosen to maximize confidence in the highest-risk code first.

**Option A (Queries first) — Selected.** With raw SQL queries as the core of the application, they are the most likely source of bugs: a wrong column name in a JOIN, a missing WHERE clause, an incorrect aggregate function. These bugs are silent — they don't crash, they just return wrong data. Testing queries against a real MySQL database first ensures the data layer is solid before building anything on top of it.

The priority order:
1. **Query functions** (integration tests against Railway dev): Does `getCollegesByState('WA', 'Seattle')` return UW Tacoma and UW Bothell but not UW Seattle? Does `searchProgramsByKeyword('Computer')` find the right programs? Does `calculateAcceptanceRate(1)` correctly compute 84.2%?
2. **API routes** (integration tests): Does `GET /api/colleges?state=WA&excludeCity=Seattle` return 200 with the correct JSON shape? Does `GET /api/colleges/999` return 404? Does `GET /api/colleges/abc` return 400 (validation error)?
3. **E2E user flows** (Playwright): Can a user search for colleges, view details, and navigate between pages?

**Option B (API routes first / outside-in) — Rejected.** Testing endpoints first catches both routing and query bugs, but when a test fails, it's harder to isolate whether the problem is in validation, query logic, or response formatting. Inside-out testing means by the time you test an API route, you already know the query layer works, so any failures must be in the route-specific logic.

**Option C (E2E first) — Rejected.** E2E tests are the slowest to write, slowest to run, and hardest to debug. Starting with them means slow feedback loops during early development when the application is changing rapidly. E2E tests are most valuable once the application is relatively stable.

---

## 6. Performance Decisions (Issues 13-16)

### Issue #13: Indexing Strategy

**Decision: Upfront indexes on known query filter columns**

The existing 12 queries define clear access patterns. Indexes should be added before the data grows.

**Specific indexes recommended based on query analysis:**

| Index | Table | Columns | Justification |
|-------|-------|---------|---------------|
| `idx_location_state_city` | `location` | `(state, city)` | Query 1 filters `WHERE state = 'WA' AND city <> 'Seattle'`. Composite index on both columns enables efficient filtering. |
| `idx_programs_name` | `programs` | `(name)` | Query 2 uses `LIKE '%Computer%'`. Leading wildcard prevents index range scan, but the index helps with `LIKE 'Computer%'` (prefix match) and general sorting. If full-text search is added later, this index provides a migration path. |
| `idx_faculty_dept_lastname` | `faculty` | `(college_id, department_id, last_name)` | Query 7 filters by college, department, and last name prefix. A composite index on all three columns enables a single index lookup for the entire WHERE clause. |
| `idx_ethnicities_college_year` | `ethnicities` | `(college_id, year)` | Query A3 groups and filters by college and year. The composite PK already covers this, but if the table grows with many ethnicities per college-year, an explicit index on the non-ethnicity columns aids aggregation queries. |
| `idx_expenses_college_year` | `expenses` | `(college_id, year)` | Query A2 joins and orders by year. Same logic as ethnicities. |

**Note on `LIKE '%keyword%'` (leading wildcard):** The programs name index will NOT help with `LIKE '%Computer%'` queries because the leading `%` prevents index use. For 3 colleges with ~12 programs, a full table scan is fast enough. If the dataset grows to hundreds of colleges with thousands of programs, consider MySQL's `FULLTEXT` index with `MATCH AGAINST` syntax.

**Option B (Reactive indexing) — Rejected.** Waiting for performance issues means users experience slow queries before they're fixed. With raw SQL and no ORM query planner hints, slow queries are harder to diagnose reactively. Adding indexes upfront costs nothing for small tables and prevents surprises.

**Option C (Full-text indexes) — Deferred.** Full-text search with `MATCH AGAINST` provides relevance-ranked results and handles partial matches better than `LIKE`. However, it changes the query syntax significantly and is overkill for the current dataset size. This can be revisited when/if the program search needs to be more sophisticated.

### Issue #14: API Response Caching

**Decision: HTTP Cache-Control headers + Vercel CDN**

College data (tuition, demographics, programs, faculty) changes infrequently — at most quarterly or annually. Caching leverages this stability.

**Option A (Cache-Control headers) — Selected.** Each API route sets appropriate `Cache-Control` response headers. Vercel's global CDN (edge network) automatically respects these headers and caches responses at edge locations worldwide.

Recommended cache durations by data volatility:
- **College list, location, walkscore:** `s-maxage=86400` (24 hours). This data almost never changes.
- **Programs, departments, faculty:** `s-maxage=3600` (1 hour). Academic data changes semesterly at most.
- **Expenses, admission stats:** `s-maxage=3600` (1 hour). Annual data.
- **Analytics endpoints:** `s-maxage=3600, stale-while-revalidate=86400` (1 hour fresh, serve stale for up to 24 hours while revalidating in background). Analytics are computed from the above data, so same volatility.

The `stale-while-revalidate` directive is particularly powerful: it means a cache-expired response is still served to the user instantly while Vercel fetches a fresh response in the background. The user never waits for a cold cache miss.

**Impact:** After the first request to any endpoint, subsequent requests from any user, anywhere in the world, are served from Vercel's nearest edge location with zero database queries. For a read-heavy application with infrequently changing data, this effectively eliminates database load during normal usage.

**Option B (In-memory caching) — Rejected.** Serverless functions on Vercel are ephemeral. A Node.js `Map` or `node-cache` instance lives only as long as the function instance is warm. Cold starts (which happen after ~5-15 minutes of inactivity on free tier) destroy the cache. This means caching behavior is inconsistent — sometimes fast, sometimes not — which is worse than no caching because it's unpredictable.

**Option C (Redis) — Rejected.** An external Redis instance (e.g., Upstash, Railway Redis) provides consistent caching independent of function lifecycle. However, it adds: another hosted service to manage, another network hop per request (function -> Redis -> maybe MySQL), another cost, and another failure point. For a project where Vercel's built-in CDN caching achieves the same goal for free, Redis is unjustified.

### Issue #15: Frontend Data Fetching

**Decision: React Server Components**

The Next.js App Router defaults to Server Components, which fetch data on the server and stream rendered HTML to the client.

**Option A (Server Components) — Selected.** Server Components are the natural fit for this application because:

1. **The data is read-only.** Users search and view college information. They don't create, edit, or delete anything. Server Components excel at rendering read-only data because there's no client-side state to manage.
2. **No loading spinners needed.** Server Components fetch data before sending HTML to the browser. The user sees a fully rendered page, not a skeleton with spinners that fill in as API calls complete.
3. **Less JavaScript shipped.** Server Components don't send their code to the browser. Only interactive elements (search bars, filter dropdowns) need to be Client Components. This means faster page loads, especially on mobile.
4. **Vercel optimization.** Vercel's infrastructure is specifically optimized for Server Components — streaming, partial rendering, and edge caching all work best with this pattern.

**Where Client Components are needed:** Any element with user interactivity:
- Search input with real-time filtering or debounced queries
- Filter dropdowns (by state, by degree level, by cost range)
- Sortable table headers
- Expandable/collapsible sections
- Mobile navigation menu

The pattern is: Server Components fetch and render the page layout and data, with `"use client"` components embedded for interactive elements. This is called the "islands of interactivity" pattern.

**Option B (Client-side fetching) — Rejected.** Using `useEffect` + `useState` or SWR/React Query to fetch data on the client means: every page shows a loading spinner while data loads, more JavaScript is shipped to the browser (the fetch library, state management, error handling), and the initial HTML is empty (bad for SEO, though SEO may not matter for a student project). The only advantage is simpler mental model for developers used to SPA patterns.

**Option C (Full SSG) — Rejected.** Static Site Generation at build time would produce the fastest possible page loads, but it requires knowing all possible pages at build time. With search parameters and filters, the set of possible pages is dynamic. SSG also means data is stale until the next build/deployment. For a project that deploys after every push, this could work, but Server Components provide nearly the same performance with the flexibility of dynamic data.

### Issue #16: N+1 Query Prevention

**Decision: JOINed composite queries + Promise.all for independent data**

The college detail page needs to display data from many tables: college info, location, programs, departments, faculty, expenses, demographics, housing, parking, walkscore, scholarships, Greek organizations, sports, and conference. Naively, this is 14 sequential database queries.

**Combined approach (Options A + B) — Selected.** Two strategies work together:

**Strategy 1: JOINed composite queries for naturally related data.** Some data is always shown together and benefits from a single JOINed query rather than separate queries:
- College + Location + Walkscore (always shown together on the header/overview)
- Department + Programs (programs are always shown under their department)
- College + Conference + Sports (athletic data is one section)

These reduce 6-8 queries to 2-3 JOINed queries.

**Strategy 2: Promise.all for independent sections.** The remaining data sections are independent of each other. Expenses don't depend on faculty. Demographics don't depend on housing. These can be fetched in parallel:

```typescript
const [expenses, demographics, housing, parking, scholarships, greekOrgs] = await Promise.all([
  getExpenses(collegeId),
  getDemographics(collegeId),
  getHousing(collegeId),
  getParkingPermits(collegeId),
  getScholarships(collegeId),
  getGreekOrganizations(collegeId),
]);
```

**Net effect:** Instead of 14 sequential queries (each waiting for the previous to complete), the detail page executes ~3 JOINed queries + ~6 parallel queries. Total latency is approximately: `max(JOIN query time, parallel query time)` rather than `sum(all 14 query times)`. With Railway network latency of ~30ms per query, this is ~60ms instead of ~420ms.

**Option C (DataLoader batching) — Rejected.** DataLoader (from Facebook) is designed for GraphQL resolvers where the same entity might be requested multiple times within a single request. In a REST API where each endpoint makes explicit, known queries, DataLoader's batching adds complexity without clear benefit. The query patterns are predetermined, not discovered at runtime.

---

## 7. Project Structure

The full planned directory structure with explanations:

```
school-finder/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (HTML shell, global styles)
│   ├── page.tsx                  # Home page / college search
│   ├── globals.css               # Global styles
│   ├── colleges/
│   │   └── [id]/
│   │       └── page.tsx          # College detail page (Server Component)
│   └── api/                      # REST API routes
│       └── colleges/
│           ├── route.ts          # GET /api/colleges
│           └── [id]/
│               ├── route.ts      # GET /api/colleges/:id
│               ├── programs/
│               │   └── route.ts  # GET /api/colleges/:id/programs
│               ├── faculty/
│               │   └── route.ts  # GET /api/colleges/:id/faculty
│               ├── departments/
│               │   └── route.ts  # GET /api/colleges/:id/departments
│               ├── expenses/
│               │   └── route.ts  # GET /api/colleges/:id/expenses
│               ├── demographics/
│               │   └── route.ts  # GET /api/colleges/:id/demographics
│               ├── housing/
│               │   └── route.ts  # GET /api/colleges/:id/housing
│               ├── parking/
│               │   └── route.ts  # GET /api/colleges/:id/parking
│               ├── scholarships/
│               │   └── route.ts  # GET /api/colleges/:id/scholarships
│               └── athletics/
│                   └── route.ts  # GET /api/colleges/:id/athletics
├── components/                   # React components
│   ├── ui/                       # Generic UI components (Button, Card, Table)
│   ├── college/                  # College-specific components
│   │   ├── CollegeCard.tsx       # College list item
│   │   ├── CollegeHeader.tsx     # College detail header
│   │   ├── ProgramList.tsx       # Programs table
│   │   ├── FacultyDirectory.tsx  # Faculty search + list
│   │   ├── ExpensesChart.tsx     # Tuition visualization
│   │   ├── DemographicsChart.tsx # Ethnicity/gender visualization
│   │   └── ...
│   └── search/                   # Search-related components
│       ├── SearchBar.tsx         # "use client" - interactive search input
│       └── FilterPanel.tsx       # "use client" - filter dropdowns
├── lib/                          # Shared library code
│   ├── db/
│   │   ├── pool.ts              # Singleton mysql2 connection pool
│   │   └── queries/
│   │       ├── colleges.ts      # College + location + walkscore queries
│   │       ├── programs.ts      # Program queries
│   │       ├── faculty.ts       # Faculty queries
│   │       ├── departments.ts   # Department queries
│   │       ├── expenses.ts      # Tuition/expense queries
│   │       ├── demographics.ts  # Ethnicity + gender queries
│   │       ├── housing.ts       # Housing queries
│   │       ├── parking.ts       # Parking permit queries
│   │       ├── scholarships.ts  # Scholarship queries
│   │       ├── athletics.ts     # Sports + conference queries
│   │       └── analytics.ts     # Analytical queries (A1-A5)
│   ├── api/
│   │   └── errors.ts            # Centralized error handler + error classes
│   └── validators/
│       ├── colleges.ts          # Zod schemas for college endpoints
│       ├── programs.ts          # Zod schemas for program endpoints
│       ├── faculty.ts           # Zod schemas for faculty endpoints
│       └── common.ts            # Shared schemas (pagination, college_id param)
├── __tests__/
│   ├── unit/
│   │   ├── validators/          # Zod schema tests
│   │   ├── errors/              # Error handler tests
│   │   └── queries/             # Query function tests (mocked pool)
│   ├── integration/
│   │   ├── api/                 # API route integration tests
│   │   └── queries/             # Query function tests (real DB)
│   └── e2e/
│       ├── search.spec.ts       # College search flow
│       ├── detail.spec.ts       # College detail page flow
│       └── navigation.spec.ts   # Cross-page navigation
├── sql/
│   ├── ryf_celestin_and_sia_preston_queries.sql  # Original DDL + DML + queries
│   └── indexes.sql              # Additional indexes for performance
├── types/                        # TypeScript type definitions
│   ├── college.ts               # College, Location, etc.
│   ├── program.ts               # Program, Department
│   ├── faculty.ts               # Faculty
│   └── api.ts                   # API response types
├── .env.local                   # Local environment variables (DB connection)
├── .env.example                 # Template for environment variables
├── jest.config.ts               # Jest configuration
├── playwright.config.ts         # Playwright configuration
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── package.json
├── README.md
└── LICENSE
```

---

## 8. API Endpoint Design

### Endpoints Derived from Existing Queries

| Method | Path | Source Query | Query Params | Description |
|--------|------|-------------|--------------|-------------|
| GET | `/api/colleges` | Q1, Q2 | `state`, `city`, `excludeCity`, `program`, `minWalk`, `minTransit` | Search/filter colleges |
| GET | `/api/colleges/:id` | — | — | Single college with location + walkscore |
| GET | `/api/colleges/:id/programs` | Q6 | `department`, `degree`, `keyword` | Programs with filters |
| GET | `/api/colleges/:id/departments` | Q5 | — | List departments |
| GET | `/api/colleges/:id/faculty` | Q7 | `department`, `lastName`, `firstName` | Faculty directory search |
| GET | `/api/colleges/:id/expenses` | A1, A2 | `year` | Tuition + acceptance rate + tuition gap |
| GET | `/api/colleges/:id/demographics` | A3, A4 | `year` | Ethnicity + gender breakdown |
| GET | `/api/colleges/:id/housing` | Q4 | — | Housing options |
| GET | `/api/colleges/:id/parking` | Q3 | `maxCost` | Parking permits with cost filter |
| GET | `/api/colleges/:id/scholarships` | — | — | Scholarship listings |
| GET | `/api/colleges/:id/athletics` | A5 | — | Sports + conference + walkability |

### Response Format

All endpoints return JSON with a consistent structure:

**Success:**
```json
{
  "data": [ ... ],
  "count": 3
}
```

**Error:**
```json
{
  "error": "College not found",
  "status": 404
}
```

---

## 9. Engineering Principles

These principles were established at the start of planning and influenced every decision:

1. **DRY is important — flag repetition aggressively.** This drove the per-entity query module pattern (Issue #5), the centralized error handler (Issue #7), and the shared Zod validators (Issue #8). Any time the same logic appears in two places, it should be extracted.

2. **Well-tested code is non-negotiable; too many tests > too few.** This drove the 3-layer testing strategy (Issue #10) and the inside-out test priority (Issue #12). Every query function, every API route, and every critical user flow should have tests.

3. **"Engineered enough" — not under-engineered and not over-engineered.** This is why raw mysql2 was chosen over Prisma (no unnecessary abstraction), why Cloudflare starts at DNS+Proxy only (no premature WAF rules), and why Redis caching was rejected (Vercel CDN is sufficient). Each decision targets the minimum complexity needed for the current requirements.

4. **Handle more edge cases, not fewer; thoughtfulness > speed.** This influenced the Zod validation choice (validate everything at the boundary), the defensive CHECK constraints already in the database schema, and the error handling pattern (handle unknown errors gracefully rather than letting them crash).

5. **Bias toward explicit over clever.** Raw SQL is more explicit than ORM queries. REST endpoints are more explicit than tRPC magic. Named query functions are more explicit than inline SQL. Cache-Control headers are more explicit than framework-level caching abstractions.

---

## 10. Workflow and Deployment

### Git Workflow

1. All development happens on **feature branches**, never directly on `main`.
2. Each feature branch is pushed to GitHub and a **Pull Request** is created.
3. Every PR is reviewed by **Greptile** (an AI code review bot) before merging.
4. After PR approval, the branch is merged to `main`.

### Deployment Pipeline

1. After every push to a feature branch, **Vercel** automatically creates a **preview deployment** for that branch.
2. After merging to `main`, Vercel automatically deploys to **production**.
3. Any database migrations (new indexes, schema changes) are applied to the Railway production instance after each merge.
4. **Cloudflare** sits in front of the Vercel deployment, proxying all traffic through its network for DDoS protection and SSL.

### Environment Variables

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `DATABASE_URL` | Railway MySQL connection string (production) | Vercel env vars |
| `DATABASE_URL_DEV` | Railway MySQL connection string (test instance) | Local `.env.local` |
| `NEXT_PUBLIC_BASE_URL` | Base URL for the application | Vercel env vars |

---

## Related Documents

- [[School Finder Project]] — High-level project overview
- [[School Finder - Architecture Decisions]] — Decision summary table
- [[School Finder - Plan Mode Process]] — How the review process works
- [[School Finder - Development Plan]] — Step-by-step implementation plan
