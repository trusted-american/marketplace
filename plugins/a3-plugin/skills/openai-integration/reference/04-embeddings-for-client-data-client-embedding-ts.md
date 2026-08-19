## Embeddings for Client Data — `client-embedding.ts`

A3 uses OpenAI embeddings to vectorize client records for semantic search.

### Generate Embedding

```typescript
// functions/src/openai/client-embedding.ts
export async function generateClientEmbedding(client: any): Promise<number[]> {
  const textToEmbed = buildClientText(client);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: textToEmbed,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

function buildClientText(client: any): string {
  const parts = [
    `Name: ${client.displayName}`,
    client.company ? `Company: ${client.company}` : '',
    client.email ? `Email: ${client.email}` : '',
    client.tags?.length ? `Tags: ${client.tags.join(', ')}` : '',
    client.notes ? `Notes: ${client.notes}` : '',
    client.address?.city ? `City: ${client.address.city}` : '',
    client.address?.state ? `State: ${client.address.state}` : '',
    client.industry ? `Industry: ${client.industry}` : '',
  ];

  return parts.filter(Boolean).join('\n');
}
```

### Batch Embedding Generation

```typescript
export async function generateBatchEmbeddings(
  clients: any[],
): Promise<Map<string, number[]>> {
  const texts = clients.map((c) => buildClientText(c));
  const embeddings = new Map<string, number[]>();

  // OpenAI supports batch embedding — up to 2048 inputs per call
  const BATCH_SIZE = 2048;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
      dimensions: 1536,
    });

    response.data.forEach((item, index) => {
      const clientIndex = i + index;
      embeddings.set(clients[clientIndex].id, item.embedding);
    });
  }

  return embeddings;
}
```

### Store Embeddings

A3 stores embeddings in Neon PostgreSQL (with pgvector) for efficient similarity search:

```typescript
import { pool } from '../utils/db';

export async function storeClientEmbedding(
  clientId: string,
  orgId: string,
  embedding: number[],
): Promise<void> {
  const vectorString = `[${embedding.join(',')}]`;

  await pool.query(
    `INSERT INTO client_embeddings (client_id, organization_id, embedding, updated_at)
     VALUES ($1, $2, $3::vector, NOW())
     ON CONFLICT (client_id)
     DO UPDATE SET embedding = $3::vector, updated_at = NOW()`,
    [clientId, orgId, vectorString],
  );
}
```

### Semantic Search

```typescript
export async function semanticSearchClients(
  query: string,
  orgId: string,
  limit: number = 10,
): Promise<Array<{ clientId: string; similarity: number }>> {
  // Generate embedding for the search query
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 1536,
  });
  const queryEmbedding = response.data[0].embedding;
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // Find nearest neighbors using pgvector cosine distance
  const result = await pool.query(
    `SELECT client_id, 1 - (embedding <=> $1::vector) AS similarity
     FROM client_embeddings
     WHERE organization_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorString, orgId, limit],
  );

  return result.rows.map((row: any) => ({
    clientId: row.client_id,
    similarity: row.similarity,
  }));
}
```

### Firestore Trigger for Auto-Embedding

```typescript
export const onClientWriteGenerateEmbedding = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}')
  .onWrite(async (change, context) => {
    const { orgId, clientId } = context.params;

    if (!change.after.exists) {
      // Client deleted — remove embedding
      await pool.query(
        'DELETE FROM client_embeddings WHERE client_id = $1',
        [clientId],
      );
      return;
    }

    const client = { id: clientId, ...change.after.data() };
    const embedding = await generateClientEmbedding(client);
    await storeClientEmbedding(clientId, orgId, embedding);
  });
```

---
