---
name: openai-integration
description: OpenAI API integration reference — 2 backend files. Chat completions, responses API, embeddings for client data
version: 0.1.0
---

# OpenAI API Integration Reference

A3 integrates OpenAI for AI-powered features including chat completions, the Responses API, and embeddings for semantic search over client data. This skill covers the 2 backend files, client initialization, prompt engineering patterns, model selection, error handling, token management, and streaming.

---

## Architecture Overview

### Backend File Map

| File | Purpose |
|---|---|
| `functions/src/openai/responses.ts` | Responses API — structured output, tool use, multi-turn conversations |
| `functions/src/openai/client-embedding.ts` | Embeddings for client data — vectorize client records for semantic search |

### Client Initialization

```typescript
// Shared OpenAI client (initialized in each file or a shared util)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  // Optional: organization ID for multi-org billing
  organization: process.env.OPENAI_ORG_ID,
});
```

### Key Points

- **openai npm package**: A3 uses the official `openai` npm package (v4+).
- **API key**: Stored in Cloud Functions environment config as `OPENAI_API_KEY`.
- **No frontend calls**: All OpenAI API calls go through the A3 backend. The API key is never exposed to the frontend.
- **Rate limits**: OpenAI enforces rate limits by model and tier. A3 handles 429 errors with retry logic.

---

## Chat Completions API

The Chat Completions API is the foundation for all text generation in A3.

### Basic Chat Completion

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful business assistant for a CRM platform.',
    },
    {
      role: 'user',
      content: userMessage,
    },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

const reply = completion.choices[0].message.content;
```

### Multi-Turn Conversation

A3 stores conversation history in Firestore and sends it with each request:

```typescript
async function chat(
  conversationId: string,
  userMessage: string,
  orgId: string,
): Promise<string> {
  // Load conversation history from Firestore
  const historyRef = admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('conversations').doc(conversationId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(50);

  const historySnapshot = await historyRef.get();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: getSystemPrompt(orgId),
    },
  ];

  historySnapshot.forEach((doc) => {
    const msg = doc.data();
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add the new user message
  messages.push({ role: 'user', content: userMessage });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const assistantMessage = completion.choices[0].message.content!;

  // Store both messages in Firestore
  const batch = admin.firestore().batch();
  const messagesRef = admin.firestore()
    .collection('organizations').doc(orgId)
    .collection('conversations').doc(conversationId)
    .collection('messages');

  batch.set(messagesRef.doc(), {
    role: 'user',
    content: userMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(messagesRef.doc(), {
    role: 'assistant',
    content: assistantMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    model: 'gpt-4o',
    usage: completion.usage,
  });

  await batch.commit();

  return assistantMessage;
}
```

### System Prompt Patterns

A3 uses context-aware system prompts tailored to the organization:

```typescript
function getSystemPrompt(orgId: string): string {
  return `You are an AI assistant for a CRM platform called A3.

Your role:
- Help users understand their client data, deals, and business metrics.
- Summarize client interactions and suggest next steps.
- Draft professional emails, proposals, and follow-up messages.
- Answer questions about business processes and best practices.

Guidelines:
- Be concise and professional.
- When referencing specific data, cite the source (e.g., "Based on the deal record...").
- Do not make up data. If you don't have enough information, ask for clarification.
- Format responses with markdown for readability.
- Respect privacy — do not discuss other organizations' data.

Organization context: ${orgId}`;
}
```

### Specialized Prompts

```typescript
// Email drafting prompt
const emailPrompt = `Draft a professional email with the following context:
- Recipient: ${clientName} (${clientEmail})
- Purpose: ${purpose}
- Tone: ${tone || 'professional and friendly'}
- Key points to cover: ${keyPoints.join(', ')}

Provide the email with a subject line and body. Use proper email formatting.`;

// Deal summary prompt
const summaryPrompt = `Summarize the following deal information:
- Title: ${deal.title}
- Client: ${deal.clientName}
- Value: ${formatCurrency(deal.value)}
- Stage: ${deal.stage}
- Notes: ${deal.notes}
- Recent activities: ${activities.map((a) => `${a.date}: ${a.description}`).join('\n')}

Provide a concise summary and suggest next steps.`;

// Client insight prompt
const insightPrompt = `Analyze the following client data and provide insights:
- Name: ${client.displayName}
- Total deals: ${client.dealCount}
- Total revenue: ${formatCurrency(client.totalRevenue)}
- Active deals: ${client.activeDeals}
- Last contact: ${client.lastContactDate}
- Tags: ${client.tags.join(', ')}
- Deal history: ${dealHistory.map((d) => `${d.title}: ${d.stage} ($${d.value})`).join('\n')}

Provide 3-5 actionable insights about this client relationship.`;
```

---

## Responses API — `responses.ts`

The Responses API (introduced in 2024) provides structured output, tool use, and built-in conversation management.

### Basic Response

```typescript
// functions/src/openai/responses.ts
export async function createResponse(req: Request, res: Response) {
  const { prompt, context } = req.body;

  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: prompt,
    instructions: 'You are a CRM assistant. Respond concisely and professionally.',
  });

  return res.json({
    output: response.output_text,
    usage: response.usage,
  });
}
```

### Structured Output with JSON Schema

The Responses API natively supports JSON schema enforcement:

```typescript
const response = await openai.responses.create({
  model: 'gpt-4o',
  input: `Extract contact information from this text: "${rawText}"`,
  text: {
    format: {
      type: 'json_schema',
      name: 'contact_info',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          company: { type: 'string', description: 'Company name' },
          title: { type: 'string', description: 'Job title' },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
});

const contactInfo = JSON.parse(response.output_text);
```

### Tool Use (Function Calling)

The Responses API supports tool definitions for agentic workflows:

```typescript
const response = await openai.responses.create({
  model: 'gpt-4o',
  input: userMessage,
  tools: [
    {
      type: 'function',
      name: 'search_clients',
      description: 'Search for clients in the CRM by name, email, or company',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          filters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['active', 'inactive', 'lead'] },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['query'],
      },
    },
    {
      type: 'function',
      name: 'get_deal_details',
      description: 'Get detailed information about a specific deal',
      parameters: {
        type: 'object',
        properties: {
          dealId: { type: 'string', description: 'The deal ID' },
        },
        required: ['dealId'],
      },
    },
    {
      type: 'function',
      name: 'create_task',
      description: 'Create a follow-up task for a team member',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          assignedTo: { type: 'string', description: 'User ID to assign to' },
          dueDate: { type: 'string', description: 'ISO date string' },
          dealId: { type: 'string', description: 'Related deal ID' },
        },
        required: ['title', 'assignedTo'],
      },
    },
  ],
});

// Process tool calls
for (const output of response.output) {
  if (output.type === 'function_call') {
    const { name, arguments: args } = output;
    const parsedArgs = JSON.parse(args);

    let toolResult: any;

    switch (name) {
      case 'search_clients':
        toolResult = await searchClients(parsedArgs.query, parsedArgs.filters);
        break;
      case 'get_deal_details':
        toolResult = await getDealDetails(parsedArgs.dealId);
        break;
      case 'create_task':
        toolResult = await createTask(parsedArgs);
        break;
    }

    // Send tool result back for a follow-up response
    const followUp = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        { role: 'user', content: userMessage },
        { type: 'function_call', name, arguments: args, call_id: output.call_id },
        {
          type: 'function_call_output',
          call_id: output.call_id,
          output: JSON.stringify(toolResult),
        },
      ],
    });

    return followUp.output_text;
  }
}
```

### Multi-Turn with Previous Response ID

The Responses API can maintain conversation state server-side:

```typescript
// First turn
const response1 = await openai.responses.create({
  model: 'gpt-4o',
  input: 'What deals do I have closing this month?',
  instructions: systemPrompt,
});

// Second turn — references previous response
const response2 = await openai.responses.create({
  model: 'gpt-4o',
  input: 'Tell me more about the largest one.',
  previous_response_id: response1.id,
});
```

---

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

## Model Selection Guide

| Model | Use Case | Cost | Speed |
|---|---|---|---|
| `gpt-4o` | Complex reasoning, tool use, structured output | Medium | Fast |
| `gpt-4o-mini` | Simple tasks, classification, extraction | Low | Very fast |
| `gpt-4.1` | Coding tasks, deep analysis | Medium-High | Fast |
| `gpt-4.1-mini` | Lightweight coding, summaries | Low | Very fast |
| `gpt-4.1-nano` | Trivial classification, yes/no | Very low | Fastest |
| `text-embedding-3-small` | Embeddings (1536 dims) | Very low | Fast |
| `text-embedding-3-large` | High-quality embeddings (3072 dims) | Low | Fast |

### A3 Model Defaults

- **Chat/Assistant**: `gpt-4o` for quality; `gpt-4o-mini` for volume tasks.
- **Structured extraction**: `gpt-4o` with JSON schema enforcement.
- **Embeddings**: `text-embedding-3-small` with 1536 dimensions.
- **Summaries/drafts**: `gpt-4o-mini` for cost efficiency.

---

## Streaming

For real-time responses in the A3 frontend:

```typescript
export async function streamChatResponse(req: Request, res: Response) {
  const { messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}
```

### Streaming with Responses API

```typescript
const stream = await openai.responses.create({
  model: 'gpt-4o',
  input: userMessage,
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'response.output_text.delta') {
    res.write(`data: ${JSON.stringify({ delta: event.delta })}\n\n`);
  }
  if (event.type === 'response.completed') {
    res.write(`data: ${JSON.stringify({ done: true, usage: event.response.usage })}\n\n`);
  }
}
```

---

## Token Management

### Counting Tokens

```typescript
import { encoding_for_model } from 'tiktoken';

function countTokens(text: string, model: string = 'gpt-4o'): number {
  const enc = encoding_for_model(model as any);
  const tokens = enc.encode(text);
  enc.free();
  return tokens.length;
}

// Truncate conversation history to fit context window
function truncateMessages(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const systemMessage = messages[0]; // Always keep system prompt
  let totalTokens = countTokens(systemMessage.content as string);
  const result = [systemMessage];

  // Add messages from most recent, working backwards
  for (let i = messages.length - 1; i >= 1; i--) {
    const msgTokens = countTokens(messages[i].content as string);
    if (totalTokens + msgTokens > maxTokens) break;
    totalTokens += msgTokens;
    result.splice(1, 0, messages[i]); // Insert after system message
  }

  return result;
}
```

### Context Window Limits

| Model | Context Window | Output Limit |
|---|---|---|
| `gpt-4o` | 128,000 tokens | 16,384 tokens |
| `gpt-4o-mini` | 128,000 tokens | 16,384 tokens |
| `gpt-4.1` | 1,047,576 tokens | 32,768 tokens |
| `text-embedding-3-small` | 8,191 tokens | N/A |

---

## Error Handling

```typescript
try {
  const completion = await openai.chat.completions.create({ ... });
  return completion;
} catch (err: any) {
  if (err instanceof OpenAI.APIError) {
    switch (err.status) {
      case 400:
        console.error('Bad request:', err.message);
        throw new Error('Invalid AI request');
      case 401:
        console.error('OpenAI API key invalid');
        throw new Error('AI service configuration error');
      case 429:
        console.error('OpenAI rate limited');
        // Retry with exponential backoff
        throw new Error('AI service busy. Please try again.');
      case 500:
      case 503:
        console.error('OpenAI server error:', err.message);
        throw new Error('AI service temporarily unavailable');
      default:
        console.error('OpenAI API error:', err.status, err.message);
        throw new Error('AI service error');
    }
  }
  throw err;
}
```

### Retry with Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err instanceof OpenAI.APIError && err.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | API key from OpenAI dashboard |
| `OPENAI_ORG_ID` | (Optional) Organization ID for billing |

---

## Common Patterns and Best Practices

1. **System prompts first**: Always start the messages array with a system message that defines the assistant's role and constraints.
2. **Temperature tuning**: Use `0.0-0.3` for factual/extraction tasks, `0.5-0.7` for balanced generation, `0.8-1.0` for creative tasks.
3. **JSON schema enforcement**: When you need structured output, use the Responses API with `json_schema` format and `strict: true`. This guarantees valid JSON.
4. **Token budgeting**: Track usage via `completion.usage` and store it in Firestore for cost monitoring. Set `max_tokens` to prevent runaway generation.
5. **Embeddings storage**: Store embeddings in PostgreSQL with pgvector, not Firestore. Vector operations require specialized indexing.
6. **Re-embed on change**: Use Firestore `onWrite` triggers to regenerate embeddings whenever client data changes.
7. **Never expose the API key**: All OpenAI calls must go through the backend. The frontend sends requests to A3 endpoints, not directly to OpenAI.
8. **Content filtering**: OpenAI may refuse certain prompts. Handle refusal responses gracefully and inform the user.
