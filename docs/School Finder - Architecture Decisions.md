# School Finder - Architecture Decisions

Decisions made during plan mode review (2026-03-04), revised to POC scope.

## Active Decisions (POC)

| Decision | Choice |
|----------|--------|
| DB Connection | Raw mysql2, no ORM. SQL queries from course project used verbatim |
| API Architecture | Next.js App Router + REST API routes |
| MySQL Hosting | TiDB Serverless (free tier, MySQL-compatible, SSL required, port 4000) |
| Connection Pool | Singleton pool in `lib/db.ts` using `globalThis._mysqlPool` (survives Next.js HMR) |
| Frontend Fetching | React Server Components (client components only for search/filter interactivity) |
| Error Handling | Simple try/catch per route, generic JSON error response |
| Input Validation | Basic type coercion, parameterized queries for SQL injection prevention |
| Styling | Tailwind CSS (functional, not pretty) |

## Deferred (Not in POC)

These were evaluated during planning but deferred for the POC:

| Decision | Original Choice | Why Deferred |
|----------|----------------|-------------|
| Cloudflare | DNS + Proxy | Not needed for demo, Vercel provides HTTPS |
| Zod validation | Per-route schemas | Overkill for 1-day build, parameterized queries are sufficient |
| Typed error classes | Centralized handler | Simple try/catch is enough for POC |
| Per-entity query modules | `lib/db/queries/*.ts` | All queries can live in route handlers or a single file |
| Testing (Jest) | Unit + Integration + E2E | No tests for POC |
| Performance indexes | Upfront on filter columns | 3 colleges, ~50 rows — no need |
| Cache-Control headers | Vercel CDN caching | Not worth the effort for demo |
| N+1 prevention | JOINs + Promise.all | Nice to have but not critical at this scale |

## Project Structure (POC)

```
school-finder/
├── app/
│   ├── page.tsx                # Home / college search
│   ├── colleges/[id]/page.tsx  # College detail
│   ├── analytics/page.tsx      # Analytics dashboard
│   └── api/
│       ├── colleges/
│       │   ├── route.ts            # GET /api/colleges (list all)
│       │   ├── search/route.ts     # Q1: colleges in area
│       │   ├── search-program/route.ts  # Q2: colleges with program
│       │   └── [id]/
│       │       ├── route.ts        # Single college detail
│       │       ├── departments/route.ts  # Q5
│       │       ├── programs/route.ts     # Q6
│       │       ├── faculty/route.ts      # Q7
│       │       ├── parking/route.ts      # Q3
│       │       └── housing/route.ts      # Q4
│       └── analytics/
│           ├── acceptance-rate/route.ts   # A1
│           ├── tuition-gap/route.ts       # A2
│           ├── demographics/route.ts      # A3
│           ├── gender/route.ts            # A4
│           └── walkable/route.ts          # A5
├── components/                 # React components
├── lib/
│   └── db.ts                  # Singleton mysql2 connection pool (~20 lines)
├── sql/
│   └── ryf_celestin_and_sia_preston_queries.sql
├── .env.example
├── .env.local (gitignored)
├── README.md
└── LICENSE
```

## Full-Scale Plan (Archived)

The original plan had 16 decisions across 4 review sections and 35 implementation steps. See [[School Finder - Complete Planning Summary]] for the full rationale. If the POC is successful and the project continues, those decisions can be revisited.
