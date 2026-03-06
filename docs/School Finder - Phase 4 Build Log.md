# School Finder - Phase 4 Build Log

Detailed record of Phase 4 (Deploy) implementation.

**Date:** 2026-03-05
**Branch:** `feat/deploy`
**Starting state:** Phase 3 complete — frontend pages merged to `main`

---

## What Was Done

Phase 4 is primarily a deployment/ops phase. Code changes were limited to README updates.

### README Updates

1. **Fixed hosting reference** — Changed "Railway" to "TiDB Serverless" in the tech stack table and setup instructions
2. **Added live URL** — Placeholder link at the top of the README (to be updated with actual Vercel URL after deploy)
3. **Added Deployment section** — Documents the required Vercel environment variables and health check endpoint

### Vercel Setup (manual steps)

1. Repo already connected to Vercel by the user
2. Environment variables to set in Vercel dashboard:
   - `DATABASE_HOST` — TiDB Serverless gateway
   - `DATABASE_PORT` — `4000`
   - `DATABASE_USER` — TiDB username
   - `DATABASE_PASSWORD` — TiDB password
   - `DATABASE_NAME` — `ryf_celestin_and_sia_preston_db`
3. Verify deployment at `/api/health`
4. Update README live URL with actual Vercel domain

---

## Files Modified

```text
README.md    # Fixed Railway → TiDB, added live URL, added Deployment section
```

---

## Related Documents

- [[School Finder - Development Plan]] — This is Phase 4 of 4 (final)
- [[School Finder - Phase 3 Build Log]] — Previous phase
- [[School Finder Project]] — Project overview
