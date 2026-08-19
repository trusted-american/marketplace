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
