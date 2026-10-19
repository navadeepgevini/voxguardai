---
name: database-inspection
description: >-
  Use this skill to inspect SQLite and Postgres database schemas, test queries, review migrations, and verify connection health safely using DBHub.
---

# Database Inspection & Migration Skill

## Capabilities
- Explores database tables, columns, indexes, and foreign keys via `search_objects`.
- Tests SQL statements in read-only mode via `execute_sql`.
- Checks database response latency and connection health via `health_check`.

## Safety Protocol
- Enforce `readonly = true` mode during diagnostic sessions.
- Prohibit all destructive operations (`DROP TABLE`, `TRUNCATE`, bulk deletions) without explicit user sign-off.
- Keep connection strings and credentials strictly in `.env.local` / `.env`.
