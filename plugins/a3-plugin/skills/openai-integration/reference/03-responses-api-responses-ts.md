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
