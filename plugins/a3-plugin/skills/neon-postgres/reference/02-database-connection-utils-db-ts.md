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
