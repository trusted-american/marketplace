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
