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
