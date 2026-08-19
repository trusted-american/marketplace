---
name: openai-integration
description: OpenAI API integration reference — 2 backend files. Chat completions, responses API, embeddings for client data
version: 0.1.0
---


# OpenAI API Integration Reference

A3 integrates OpenAI for AI-powered features including chat completions, the Responses API, and embeddings for semantic search over client data. This skill covers the 2 backend files, client initialization, prompt engineering patterns, model selection, error handling, token management, and streaming.

---

## How to use this skill

This file is an **index**. The detail lives in `reference/` so you load only what the
task needs. Find your topic below, read that one file, and stop. Never read the whole
`reference/` directory, and never read a reference file "for background".

| File | Covers |
|------|--------|
| `reference/02-chat-completions-api.md` | Chat Completions API |
| `reference/03-responses-api-responses-ts.md` | Responses API — `responses.ts` |
| `reference/04-embeddings-for-client-data-client-embedding-ts.md` | Embeddings for Client Data — `client-embedding.ts` |
| `reference/08-error-handling.md` | Error Handling |

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
