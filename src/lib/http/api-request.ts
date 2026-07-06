import type { z } from "zod";

// Thrown when a request is aborted by its timeout budget. Callers map this to a
// domain-specific outcome (e.g. a TIMEOUT generation error) so a hung request can
// never leave the caller's promise pending.
export class RequestTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

async function requestJson<TSchema extends z.ZodType>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  route: string,
  body: unknown,
  schema: TSchema,
  timeoutMs?: number,
): Promise<z.infer<TSchema>> {
  const controller = timeoutMs !== undefined ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const response = await fetch(route, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
    const payload = await response.json().catch(() => ({ error: "Invalid server response." }));
    return schema.parse(payload);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new RequestTimeoutError();
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function postJson<TSchema extends z.ZodType>(
  route: string,
  body: unknown,
  schema: TSchema,
  timeoutMs?: number,
): Promise<z.infer<TSchema>> {
  return requestJson("POST", route, body, schema, timeoutMs);
}

export function patchJson<TSchema extends z.ZodType>(
  route: string,
  body: unknown,
  schema: TSchema,
  timeoutMs?: number,
): Promise<z.infer<TSchema>> {
  return requestJson("PATCH", route, body, schema, timeoutMs);
}

export function putJson<TSchema extends z.ZodType>(
  route: string,
  body: unknown,
  schema: TSchema,
  timeoutMs?: number,
): Promise<z.infer<TSchema>> {
  return requestJson("PUT", route, body, schema, timeoutMs);
}

export function deleteJson<TSchema extends z.ZodType>(
  route: string,
  schema: TSchema,
  timeoutMs?: number,
): Promise<z.infer<TSchema>> {
  return requestJson("DELETE", route, undefined, schema, timeoutMs);
}
