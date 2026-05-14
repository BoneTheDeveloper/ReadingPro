# Streaming Chat with Vercel AI SDK v6 Research Report

## Server-Side: Route Handler Implementation

**File**: `app/api/study-chat/route.ts`

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages, passageContent }: { 
    messages: UIMessage[]; 
    passageContent?: string 
  } = await req.json();

  const systemPrompt = `You are an English reading comprehension tutor. Help users understand the passage content. 
  ${passageContent ? `Here's the passage for reference: ${passageContent}` : ''}`;

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
    maxTokens: 1000,
  });

  return result.toUIMessageStreamResponse();
}
```

## Client-Side: useChat Hook Implementation

**File**: `app/study-chat/page.tsx` (client component)

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function StudyChatPage() {
  const [passageContent, setPassageContent] = useState('');
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/study-chat',
    onFinish: (message) => {
      console.log('Chat completed:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit({ 
      text: input,
      additionalData: { passageContent }
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap">
            <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <div key={`${message.id}-${i}`}>{part.text}</div>;
                default:
                  return <div key={`${message.id}-${i}`}>Unknown part type</div>;
              }
            })}
          </div>
        ))}
        {isLoading && <div className="text-gray-500">AI is thinking...</div>}
      </div>
      
      <form onSubmit={handleSend} className="p-4 border-t">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the passage..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

## Key Import Paths

```typescript
// Server-side (Route Handler)
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

// Client-side (React Hook)
import { useChat } from '@ai-sdk/react';
```

## Handling Context and System Prompts

- **Passage content**: Pass via `additionalData` in form submission or include in system prompt
- **System prompts**: Use `system` property in `streamText` config
- **Dynamic context**: Modify system prompt before passing to `streamText`

## Streaming Response Handling

- **Client hook**: `useChat` automatically manages streaming state
- **Real-time rendering**: Messages update as tokens arrive
- **Loading states**: Built-in `isLoading` state during streaming
- **Error handling**: `onError` callback for error handling

## Tool Integration Pattern

For complex study tools:

```typescript
// Route Handler
const result = streamText({
  model: openai('gpt-4o-mini'),
  system: systemPrompt,
  messages: await convertToModelMessages(messages),
  tools: {
    getExplanation: tool({
      description: "Get detailed explanation of a text passage",
      parameters: z.object({ 
        text: z.string(),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced'])
      }),
      execute: async ({ text, difficulty }) => {
        // Implementation
      }
    })
  }
});
```

**Status:** DONE
**Summary:** Found complete v6 implementation patterns for server-side streaming with `streamText` and client-side UI with `useChat`
**Trade-offs:** Requires @ai-sdk/react package for hooks, but provides excellent streaming out-of-the-box

**Sources:**
- [Vercel AI SDK v6 Next.js App Router Docs](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)
- [AI SDK Streaming Interfaces Tutorial](https://callsphere.tech/blog/vercel-ai-sdk-streaming-interfaces-react-nextjs-usechat)