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
