---
name: neon-postgres
description: Neon PostgreSQL integration reference — 3 backend files. Connection pooling, parameterized queries, and data migration scripts alongside Firestore
version: 0.1.0
---


# Neon PostgreSQL Integration Reference

A3 uses Neon PostgreSQL alongside Firestore for use cases that require relational queries, vector similarity search, complex aggregations, and structured data exports. This skill covers the 3 backend files, connection pooling, parameterized queries, SQL injection prevention, the Neon serverless driver, data migration scripts, and guidance on when to use Postgres vs Firestore.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-database-connection-utils-db-ts.md` | Database Connection — `utils/db.ts` |
| `reference/06-database-schema.md` | Database Schema |
| `reference/07-client-upload-script-client-upload-ts.md` | Client Upload Script — `client-upload.ts` |
| `reference/09-common-query-patterns.md` | Common Query Patterns |
| `reference/10-when-to-use-postgres-vs-firestore.md` | When to Use Postgres vs Firestore |
| `reference/11-error-handling.md` | Error Handling |

## Architecture Overview

### Backend File Map

| File | Purpose |
|---|---|
| `functions/src/utils/db.ts` | PostgreSQL pool setup, connection management, query helpers |
| `functions/src/neon/client-upload.ts` | Script to bulk upload client data from Firestore to Neon |
| `functions/src/neon/client-remove.ts` | Script to remove client data from Neon when deleted in Firestore |

### Dual Database Architecture

A3 maintains Firestore as the primary database for real-time data and Neon PostgreSQL as a secondary store for:

- **Vector embeddings** (pgvector for semantic search)
- **Complex aggregations** (revenue reports, pipeline analytics)
- **Relational queries** (joins across clients, deals, invoices)
- **Data exports** (CSV/Excel generation from SQL queries)
- **Audit logs** (high-volume append-only data)

---
## Neon Serverless Driver

For lightweight or edge deployments, A3 can use the Neon serverless driver instead of `pg`:

```typescript
import { neon, neonConfig } from '@neondatabase/serverless';

// Configure for Cloud Functions
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.NEON_DATABASE_URL!);

// Usage — tagged template literal
const result = await sql`
  SELECT * FROM clients
  WHERE organization_id = ${orgId}
  LIMIT ${limit}
`;
```

### Serverless Driver vs pg Pool

| Feature | `pg` Pool | Neon Serverless Driver |
|---|---|---|
| Connection model | Persistent TCP connections | HTTP-based, per-query |
| Cold start | Slower (TCP + SSL handshake) | Faster (HTTP) |
| Throughput | Higher for sustained load | Lower per-query overhead |
| Use case | Backend Cloud Functions | Edge functions, lightweight queries |
| Transaction support | Full | Via `neon(..., { fullResults: true })` |
| Streaming | Yes | No |

A3 primarily uses `pg` Pool for backend Cloud Functions and reserves the serverless driver for edge cases.

---
## Parameterized Queries (SQL Injection Prevention)

**Critical**: All queries in A3 use parameterized queries. Never interpolate user input into SQL strings.

### Correct Pattern

```typescript
// CORRECT — parameterized query
const result = await pool.query(
  'SELECT * FROM clients WHERE organization_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3',
  [orgId, status, limit],
);
```

### Incorrect Pattern (NEVER DO THIS)

```typescript
// WRONG — SQL injection vulnerability
const result = await pool.query(
  `SELECT * FROM clients WHERE organization_id = '${orgId}' AND status = '${status}'`,
);
```

### Parameter Placeholders

PostgreSQL uses `$1`, `$2`, `$3`, etc. for parameter placeholders. The parameters array is passed as the second argument to `pool.query`.

```typescript
// Insert with parameterized values
await pool.query(
  `INSERT INTO clients (id, organization_id, display_name, email, company, created_at)
   VALUES ($1, $2, $3, $4, $5, NOW())
   ON CONFLICT (id) DO UPDATE SET
     display_name = $3,
     email = $4,
     company = $5,
     updated_at = NOW()`,
  [clientId, orgId, displayName, email, company],
);
```

---
## Query Helper Functions

### Generic Query Helper

```typescript
// functions/src/utils/db.ts

export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params?: any[],
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

export async function execute(
  text: string,
  params?: any[],
): Promise<QueryResult> {
  return pool.query(text, params);
}
```

### Transaction Helper

```typescript
export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Usage
await withTransaction(async (client) => {
  await client.query(
    'INSERT INTO audit_logs (action, entity_id, user_id) VALUES ($1, $2, $3)',
    ['deal_updated', dealId, userId],
  );
  await client.query(
    'UPDATE deal_metrics SET updated_at = NOW() WHERE deal_id = $1',
    [dealId],
  );
});
```

---
## Client Remove Script — `client-remove.ts`

Removes client data from Neon when clients are deleted.

```typescript
// functions/src/neon/client-remove.ts
import { pool } from '../utils/db';

export async function removeClientFromNeon(clientId: string): Promise<void> {
  // CASCADE will also delete from client_embeddings
  await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
}

export async function removeOrganizationClientsFromNeon(orgId: string): Promise<number> {
  const result = await pool.query(
    'DELETE FROM clients WHERE organization_id = $1',
    [orgId],
  );
  return result.rowCount || 0;
}

// Batch removal
export async function removeClientsFromNeon(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0;

  const result = await pool.query(
    'DELETE FROM clients WHERE id = ANY($1)',
    [clientIds],
  );
  return result.rowCount || 0;
}
```

---
## Neon-Specific Features

### Branching

Neon supports database branching (like git branches):

```bash
# Create a branch for testing
neon branches create --project-id <project-id> --name staging --parent main

# Each branch has its own connection string
# Use for staging/testing without affecting production
```

### Auto-Suspend

Neon automatically suspends compute after 5 minutes of inactivity (free tier). The first query after suspension has a cold start of ~500ms-2s. A3 handles this with:

```typescript
// Warm the connection pool on function startup
pool.query('SELECT 1').catch(() => {
  console.warn('Neon cold start — first query may be slow');
});
```

### Connection Pooling (Neon-Side)

Neon provides a built-in connection pooler via PgBouncer. Use the pooled connection string (port 5432 with `-pooler` suffix) for serverless workloads:

```
postgresql://user:pass@ep-xxxxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
```

---
## Environment Variables Required

| Variable | Description |
|---|---|
| `NEON_DATABASE_URL` | Full connection string with credentials and SSL |

---
## Common Patterns and Best Practices

1. **Always parameterize**: Never interpolate user input into SQL strings. Use `$1`, `$2`, etc.
2. **Use transactions for multi-step writes**: Wrap related writes in `withTransaction` to ensure atomicity.
3. **Index strategically**: Add indexes for columns used in WHERE, JOIN, and ORDER BY clauses. Monitor query performance with `EXPLAIN ANALYZE`.
4. **Firestore is source of truth**: Neon is a derived store. If data diverges, Firestore wins. The sync triggers ensure eventual consistency.
5. **Pool size awareness**: In Cloud Functions, each instance has its own pool. With `max: 10` and many function instances, you can exceed Neon's connection limit. Use the Neon pooler endpoint to mitigate.
6. **Handle cold starts**: Neon auto-suspends idle compute. The first query may be slow. Consider a keep-alive ping for latency-sensitive endpoints.
7. **pgvector tuning**: For the IVFFlat index on embeddings, set `lists` to approximately `sqrt(total_rows)`. Rebuild the index periodically as data grows.
8. **Batch inserts**: For bulk operations, use multi-row INSERT with parameterized values rather than individual INSERT statements.
