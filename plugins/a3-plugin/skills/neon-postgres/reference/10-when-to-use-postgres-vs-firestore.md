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
