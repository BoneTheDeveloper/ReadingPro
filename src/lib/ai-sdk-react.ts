"use client";

import { useCallback, useRef, useState } from "react";

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

type ChatRequestOptions = {
  body?: Record<string, unknown>;
};

type CreateMessage = {
  text: string;
};

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

type UseChatOptions = {
  api?: string;
  body?: Record<string, unknown>;
};

/**
 * Creates a text-only chat message in the UIMessage shape expected by the
 * local useChat compatibility hook and the study chat API.
 */
function createMessage(role: UIMessage["role"], text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: "text", text }],
  };
}

/**
 * Implements the subset of the AI SDK useChat API needed by the study chat UI,
 * including streaming text updates, cancellation, status, and error state.
 */
export function useChat({ api = "/api/chat", body }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Aborts the active streaming request and returns the hook to the ready state.
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("ready");
  }, []);

  /**
   * Posts the current conversation to the configured chat endpoint and appends
   * streamed response chunks to the pending assistant message.
   */
  const sendMessage = useCallback(
    async (message: CreateMessage, options?: ChatRequestOptions) => {
      const userMessage = createMessage("user", message.text);
      const assistantMessage = createMessage("assistant", "");
      const nextMessages = [...messages, userMessage];
      const requestBody = options?.body ?? body;
      const abortController = new AbortController();

      abortControllerRef.current = abortController;
      setError(undefined);
      setStatus("submitted");
      setMessages([...nextMessages, assistantMessage]);

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, messages: nextMessages }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat request failed (${response.status})`);
        }

        if (!response.body) {
          throw new Error("Chat response did not include a stream.");
        }

        setStatus("streaming");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          setMessages((currentMessages) =>
            currentMessages.map((currentMessage) =>
              currentMessage.id === assistantMessage.id
                ? {
                    ...currentMessage,
                    parts: [
                      {
                        type: "text",
                        text: `${currentMessage.parts[0]?.text ?? ""}${chunk}`,
                      },
                    ],
                  }
                : currentMessage,
            ),
          );
        }

        setStatus("ready");
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          setStatus("ready");
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error("Chat request failed."),
        );
        setStatus("error");
      } finally {
        abortControllerRef.current = null;
      }
    },
    [api, body, messages],
  );

  return {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
  };
}

export type { UIMessage };
