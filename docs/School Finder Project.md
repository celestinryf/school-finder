# School Finder Project

## Overview

A proof-of-concept college/university finder application built on a normalized MySQL database. Created by Celestin Ryf and Preston Sia as a database course project. The goal is to demonstrate that the normalized database design works with a web UI — all 12 queries (7 scenario + 5 analytical) exposed via API routes and rendered in a frontend.

## Scope

This is a **POC**, not a production application. No tests, no Cloudflare, no Zod validation, no typed error classes, no performance optimization. Just a Next.js app that connects to MySQL, runs the queries, and displays results. Designed to be built in 1 day.

## Tech Stack

- **Framework:** Next.js (App Router, deployed on Vercel)
- **Backend:** Node.js (Next.js API routes, raw SQL)
- **Database:** MySQL 8 (hosted on TiDB Serverless, MySQL-compatible, free tier)
- **DB Driver:** mysql2 (no ORM)
- **Auth:** None

## Database Schema (18 tables)

Central entity is `colleges` with `college_id` as the primary key linking to all other tables.

### Core Tables

| Table | Purpose |
|-------|---------|
| colleges | Main college info (name, campus, type, fscl, website) |
| location | Street address, city, state, postal code |
| college_phones | Phone numbers with types |
| departments | Academic departments per college |
| faculty | Faculty members (email PK) |
| programs | Academic programs per department |

### Statistics & Demographics

| Table | Purpose |
|-------|---------|
| admission_statistics | Apps received/admitted by year |
| expenses | Tuition (resident/nonresident) + books by year |
| ethnicities | Enrollment % by ethnicity per year |
| gender | Enrollment % by gender per year |

### Campus Life

| Table | Purpose |
|-------|---------|
| housing | On/off campus housing buildings |
| parking_permits | Permit types with costs |
| walkscore_stats | Walk/transit/bike scores (0-100) |
| scholarships | Available scholarships with deadlines |
| greek_organizations | Greek life orgs |

### Athletics

| Table | Purpose |
|-------|---------|
| sports | Sport name + gender lookup |
| college_sports | Sports offered per college |
| college_conference | Athletic conference + division |

## Current Data

- UW Tacoma (college_id: 1)
- UW Bothell (college_id: 2)
- UW Seattle (college_id: 3)

## All 12 Queries

### 7 Scenario Queries

| # | Query | API Endpoint |
|---|-------|-------------|
| Q1 | Colleges in a particular area with programs | `GET /api/colleges/search` |
| Q2 | Search for colleges with a particular program | `GET /api/colleges/search-program` |
| Q3 | Parking permits under a max cost | `GET /api/colleges/[id]/parking` |
| Q4 | Housing options for a college | `GET /api/colleges/[id]/housing` |
| Q5 | Departments for a college | `GET /api/colleges/[id]/departments` |
| Q6 | Programs for a department with filters | `GET /api/colleges/[id]/programs` |
| Q7 | Faculty directory search | `GET /api/colleges/[id]/faculty` |

### 5 Analytical Queries

| # | Query | API Endpoint |
|---|-------|-------------|
| A1 | Acceptance rate trend | `GET /api/analytics/acceptance-rate` |
| A2 | Tuition gap (nonresident - resident) | `GET /api/analytics/tuition-gap` |
| A3 | Diversity composition (top ethnicities) | `GET /api/analytics/demographics` |
| A4 | Gender distribution pivot | `GET /api/analytics/gender` |
| A5 | Highly walkable + transit accessible colleges | `GET /api/analytics/walkable` |

## Pages

1. **Home** (`/`) — College list with search by program and state filter
2. **College Detail** (`/colleges/[id]`) — Overview, departments, programs, faculty, parking, housing
3. **Analytics** (`/analytics`) — All 5 analytical queries displayed as tables

## Project Structure

```
school-finder/
├── app/
│   ├── page.tsx                # Home / college search
│   ├── colleges/[id]/page.tsx  # College detail
│   ├── analytics/page.tsx      # Analytics dashboard
│   └── api/
│       ├── colleges/           # Q1-Q7 endpoints
│       └── analytics/          # A1-A5 endpoints
├── components/                 # React components
├── lib/
│   └── db.ts                  # Singleton MySQL connection pool
└── sql/
    └── ryf_celestin_and_sia_preston_queries.sql
```

## Related Documents

- [[School Finder - Development Plan]] — Step-by-step build plan (9 steps, ~7 hours)
- [[School Finder - Architecture Decisions]] — Original full-scale decisions (archived)
- [[School Finder - Complete Planning Summary]] — Exhaustive rationale (archived)
- [[School Finder - Phase 2 Build Log]] — API routes implementation
- [[School Finder - Phase 3 Build Log]] — Frontend implementation
- [[School Finder - Phase 4 Build Log]] — Deployment to Vercel
- [[School Finder - Plan Mode Process]] — How the review process works
