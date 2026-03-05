# School Finder

A proof-of-concept college and university information lookup tool built on a normalized MySQL database. Demonstrates that a well-designed relational schema can power a web application with search, detail views, and analytics.

Built by **Celestin Ryf** and **Preston Sia**.

## Features

### College Search
- Search colleges by **state and city**
- Filter by **academic programs** (keyword search)
- View all colleges with key stats

### College Detail Pages
- **Overview** — Name, campus, type, website, location, walk/transit/bike scores
- **Departments** — Academic departments/schools
- **Programs** — Filter by department and degree level
- **Faculty Directory** — Search by last name and department
- **Parking** — Permits filterable by max cost
- **Housing** — On/off campus options

### Analytics Dashboard
- **Acceptance rate** trends by year
- **Tuition gap** analysis (nonresident vs. resident)
- **Diversity composition** — Ethnicities by campus
- **Gender distribution** by campus and year
- **Walkability rankings** — Most walkable and transit-friendly colleges

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Database | MySQL 8 |
| DB Driver | [mysql2](https://github.com/sidorares/node-mysql2) (raw SQL) |
| Hosting | [Vercel](https://vercel.com/) (app) + [Railway](https://railway.app/) (database) |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/school-finder.git
cd school-finder
npm install
```

### 2. Set up the database

**Option A: Local MySQL**

```bash
mysql -u root -p < sql/ryf_celestin_and_sia_preston_queries.sql
```

**Option B: Railway**

1. Create a MySQL service on [Railway](https://railway.app/)
2. Import the SQL script via Railway's web UI or CLI

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=ryf_celestin_and_sia_preston_db
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
school-finder/
├── app/
│   ├── page.tsx                # Home / college search
│   ├── colleges/[id]/page.tsx  # College detail
│   ├── analytics/page.tsx      # Analytics dashboard
│   └── api/                    # REST API routes
│       ├── colleges/           # College search + detail + sub-resources
│       └── analytics/          # Analytical query endpoints
├── components/                 # React components
├── lib/
│   └── db.ts                  # MySQL connection pool
├── sql/
│   └── ryf_celestin_and_sia_preston_queries.sql
└── README.md
```

## API Endpoints

### Scenario Queries (7)

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/colleges/search` | Q1 | Colleges in area with programs. Params: `state`, `excludeCity` |
| GET | `/api/colleges/search-program` | Q2 | Colleges with a program. Params: `keyword` |
| GET | `/api/colleges/[id]/parking` | Q3 | Parking permits. Params: `maxCost` |
| GET | `/api/colleges/[id]/housing` | Q4 | Housing options |
| GET | `/api/colleges/[id]/departments` | Q5 | Departments list |
| GET | `/api/colleges/[id]/programs` | Q6 | Programs by department. Params: `departmentId`, `degree` |
| GET | `/api/colleges/[id]/faculty` | Q7 | Faculty search. Params: `departmentId`, `lastNamePrefix` |

### Analytical Queries (5)

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/analytics/acceptance-rate` | A1 | Acceptance rate trend. Params: `collegeId` |
| GET | `/api/analytics/tuition-gap` | A2 | Tuition gap by college |
| GET | `/api/analytics/demographics` | A3 | Ethnicity breakdown. Params: `collegeId` |
| GET | `/api/analytics/gender` | A4 | Gender distribution. Params: `collegeId` |
| GET | `/api/analytics/walkable` | A5 | Walkable + transit-accessible colleges |

## Database

18 normalized tables centered around `colleges`. See the [SQL script](sql/ryf_celestin_and_sia_preston_queries.sql) for full schema, seed data, and queries.

### Seed Data

| Campus | ID | Departments | Programs | Faculty |
|--------|----|-------------|----------|---------|
| UW Tacoma | 1 | 3 | 2 | 26 |
| UW Bothell | 2 | 5 | 5 | 8 |
| UW Seattle | 3 | 5 | 5 | 7 |

## License

[MIT](LICENSE)
