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
