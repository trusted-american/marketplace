---
name: neon-postgres
description: Neon PostgreSQL integration reference — 3 backend files. Connection pooling, parameterized queries, and data migration scripts alongside Firestore
version: 0.1.0
---

# Neon PostgreSQL Integration Reference

A3 uses Neon PostgreSQL alongside Firestore for use cases that require relational queries, vector similarity search, complex aggregations, and structured data exports. This skill covers the 3 backend files, connection pooling, parameterized queries, SQL injection prevention, the Neon serverless driver, data migration scripts, and guidance on when to use Postgres vs Firestore.

---

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

## Database Connection — `utils/db.ts`

### Pool Setup with `pg`

```typescript
// functions/src/utils/db.ts
import { Pool, PoolConfig, QueryResult } from 'pg';

const poolConfig: PoolConfig = {
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 10,                   // Maximum pool connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout connecting after 10s
  allowExitOnIdle: true,     // Allow process to exit if pool is idle
};

export const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected Neon pool error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
});
```

### Connection String Format

```
postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

| Component | Description |
|---|---|
| `username` | Neon project role name |
| `password` | Role password |
| `ep-xxxxx.us-east-2.aws.neon.tech` | Neon endpoint hostname |
| `dbname` | Database name (default: `neondb`) |
| `sslmode=require` | SSL is mandatory for Neon connections |

### Key Points

- **Connection pooling**: A3 uses the `pg` Pool, which manages a pool of connections. Each Cloud Function invocation reuses connections from the pool.
- **SSL required**: Neon mandates SSL. The `ssl: { rejectUnauthorized: true }` ensures certificate validation.
- **Pool size**: `max: 10` limits concurrent connections. In Cloud Functions, each function instance has its own pool. Neon's free tier allows up to 100 concurrent connections.
- **Idle timeout**: Connections idle for 30 seconds are closed. This is important in serverless environments where function instances may be recycled.
- **Exit on idle**: `allowExitOnIdle: true` prevents the Node.js process from staying alive just because idle pool connections exist.

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

## Database Schema

### Core Tables

```sql
-- Client data (synced from Firestore)
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  address_city TEXT,
  address_state TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  deal_count INTEGER DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients (organization_id);
CREATE INDEX idx_clients_email ON clients (email);
CREATE INDEX idx_clients_status ON clients (organization_id, status);

-- Client embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE client_embeddings (
  client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_org ON client_embeddings (organization_id);
CREATE INDEX idx_embeddings_vector ON client_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Deal metrics (aggregated data)
CREATE TABLE deal_metrics (
  deal_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  value NUMERIC(12, 2) DEFAULT 0,
  pipeline_name TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_deals_org ON deal_metrics (organization_id);
CREATE INDEX idx_deals_stage ON deal_metrics (organization_id, stage);
CREATE INDEX idx_deals_assigned ON deal_metrics (organization_id, assigned_to);

-- Audit logs (append-only)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org_date ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
```

---

## Client Upload Script — `client-upload.ts`

Bulk uploads Firestore client data to Neon PostgreSQL.

```typescript
// functions/src/neon/client-upload.ts
import * as admin from 'firebase-admin';
import { pool } from '../utils/db';

export async function uploadClientsToNeon(orgId: string): Promise<number> {
  const snapshot = await admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('clients')
    .get();

  if (snapshot.empty) return 0;

  let uploadedCount = 0;
  const BATCH_SIZE = 500;
  const clients = snapshot.docs;

  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    const batch = clients.slice(i, i + BATCH_SIZE);

    // Build bulk INSERT with ON CONFLICT for upsert
    const values: any[] = [];
    const placeholders: string[] = [];

    batch.forEach((doc, index) => {
      const data = doc.data();
      const offset = index * 9; // 9 columns
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`,
      );
      values.push(
        doc.id,
        orgId,
        data.displayName || '',
        data.email || null,
        data.company || null,
        data.phone || null,
        data.address?.city || null,
        data.address?.state || null,
        data.tags || [],
      );
    });

    const sql = `
      INSERT INTO clients (id, organization_id, display_name, email, company, phone, address_city, address_state, tags)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        company = EXCLUDED.company,
        phone = EXCLUDED.phone,
        address_city = EXCLUDED.address_city,
        address_state = EXCLUDED.address_state,
        tags = EXCLUDED.tags,
        updated_at = NOW()
    `;

    await pool.query(sql, values);
    uploadedCount += batch.length;
  }

  return uploadedCount;
}
```

### Trigger-Based Sync

For real-time sync, A3 uses Firestore triggers:

```typescript
export const onClientWriteSyncNeon = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onWrite(async (change, context) => {
    const { orgId, clientId } = context.params;

    if (!change.after.exists) {
      // Deleted — remove from Neon
      await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
      return;
    }

    const data = change.after.data()!;

    await pool.query(
      `INSERT INTO clients (id, organization_id, display_name, email, company, phone, address_city, address_state, tags, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         display_name = $3, email = $4, company = $5, phone = $6,
         address_city = $7, address_state = $8, tags = $9, status = $10,
         updated_at = NOW()`,
      [
        clientId, orgId,
        data.displayName || '', data.email || null,
        data.company || null, data.phone || null,
        data.address?.city || null, data.address?.state || null,
        data.tags || [], data.status || 'active',
      ],
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

## Common Query Patterns

### Aggregation Queries

```typescript
// Revenue by stage for pipeline report
const revenue = await query<{ stage: string; total: number; count: number }>(
  `SELECT stage, SUM(value) as total, COUNT(*) as count
   FROM deal_metrics
   WHERE organization_id = $1
   GROUP BY stage
   ORDER BY total DESC`,
  [orgId],
);

// Monthly revenue trend
const monthlyRevenue = await query(
  `SELECT
     DATE_TRUNC('month', closed_at) as month,
     SUM(value) as revenue,
     COUNT(*) as deals_closed
   FROM deal_metrics
   WHERE organization_id = $1
     AND stage = 'closed_won'
     AND closed_at >= $2
   GROUP BY DATE_TRUNC('month', closed_at)
   ORDER BY month`,
  [orgId, startDate],
);

// Top clients by revenue
const topClients = await query(
  `SELECT c.id, c.display_name, c.company,
          SUM(d.value) as total_revenue,
          COUNT(d.deal_id) as deal_count
   FROM clients c
   JOIN deal_metrics d ON d.client_id = c.id
   WHERE c.organization_id = $1
     AND d.stage = 'closed_won'
   GROUP BY c.id, c.display_name, c.company
   ORDER BY total_revenue DESC
   LIMIT $2`,
  [orgId, limit],
);
```

### Vector Similarity Search

```typescript
// Find similar clients using pgvector
const similarClients = await query(
  `SELECT ce.client_id, c.display_name, c.company,
          1 - (ce.embedding <=> $1::vector) as similarity
   FROM client_embeddings ce
   JOIN clients c ON c.id = ce.client_id
   WHERE ce.organization_id = $2
   ORDER BY ce.embedding <=> $1::vector
   LIMIT $3`,
  [queryVector, orgId, limit],
);
```

### Full-Text Search (Alternative to Algolia)

```typescript
// PostgreSQL full-text search as a fallback
const results = await query(
  `SELECT id, display_name, email, company,
          ts_rank(to_tsvector('english', display_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(company, '')),
                  plainto_tsquery('english', $1)) as rank
   FROM clients
   WHERE organization_id = $2
     AND to_tsvector('english', display_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(company, ''))
         @@ plainto_tsquery('english', $1)
   ORDER BY rank DESC
   LIMIT $3`,
  [searchQuery, orgId, limit],
);
```

### Audit Log Queries

```typescript
// Recent activity for an entity
const logs = await query(
  `SELECT action, user_id, details, created_at
   FROM audit_logs
   WHERE entity_type = $1 AND entity_id = $2
   ORDER BY created_at DESC
   LIMIT $3`,
  ['deal', dealId, 50],
);

// Activity feed for organization
const feed = await query(
  `SELECT al.action, al.entity_type, al.entity_id, al.details, al.created_at, al.user_id
   FROM audit_logs al
   WHERE al.organization_id = $1
     AND al.created_at >= $2
   ORDER BY al.created_at DESC
   LIMIT $3`,
  [orgId, sinceDate, 100],
);
```

---

## When to Use Postgres vs Firestore

| Use Case | Database | Reason |
|---|---|---|
| Real-time client/deal data | Firestore | Real-time listeners, offline support |
| User authentication data | Firestore | Tight Firebase Auth integration |
| Application state | Firestore | Fast reads, real-time sync |
| Vector embeddings | PostgreSQL | pgvector extension, similarity search |
| Complex joins | PostgreSQL | Relational queries across entities |
| Aggregation reports | PostgreSQL | SUM, AVG, GROUP BY, window functions |
| Data exports (CSV/Excel) | PostgreSQL | SQL queries output tabular data |
| Audit logs | PostgreSQL | Append-only, high volume, queried by date range |
| Full-text search (backup) | PostgreSQL | `tsvector` / `tsquery` for fallback search |
| File metadata | Firestore | Lightweight, real-time |
| Settings/config | Firestore | Simple key-value, real-time updates |

### Data Flow

```
Firestore (source of truth)
    |
    ├── Firestore triggers (onCreate, onUpdate, onDelete)
    |       |
    |       └── Sync to Neon PostgreSQL
    |               ├── clients table
    |               ├── client_embeddings table
    |               ├── deal_metrics table
    |               └── audit_logs table
    |
    └── Frontend reads (real-time listeners)

PostgreSQL (analytics & search)
    |
    ├── Aggregation queries (reports, dashboards)
    ├── Vector similarity search (semantic search)
    ├── Relational joins (cross-entity queries)
    └── Data exports (CSV, Excel)
```

---

## Error Handling

```typescript
try {
  const result = await pool.query(sql, params);
  return result.rows;
} catch (err: any) {
  // Connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('Cannot connect to Neon:', err.message);
    throw new Error('Database connection failed');
  }

  // Query errors
  if (err.code === '23505') {
    // unique_violation
    console.error('Duplicate key:', err.detail);
    throw new Error('Record already exists');
  }
  if (err.code === '23503') {
    // foreign_key_violation
    console.error('Foreign key violation:', err.detail);
    throw new Error('Referenced record does not exist');
  }
  if (err.code === '42P01') {
    // undefined_table
    console.error('Table does not exist:', err.message);
    throw new Error('Database schema error');
  }
  if (err.code === '57014') {
    // query_canceled (timeout)
    console.error('Query timed out:', err.message);
    throw new Error('Query took too long');
  }

  console.error('PostgreSQL error:', err.code, err.message);
  throw new Error('Database query failed');
}
```

### PostgreSQL Error Codes

| Code | Name | Meaning |
|---|---|---|
| `23505` | `unique_violation` | Duplicate key on unique constraint |
| `23503` | `foreign_key_violation` | FK reference does not exist |
| `23502` | `not_null_violation` | NULL value in non-nullable column |
| `42P01` | `undefined_table` | Table does not exist |
| `42703` | `undefined_column` | Column does not exist |
| `57014` | `query_canceled` | Query exceeded statement_timeout |
| `08006` | `connection_failure` | Connection dropped |
| `53300` | `too_many_connections` | Max connections exceeded |

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
