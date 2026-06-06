import { NextRequest } from "next/server";
import type { z } from "zod";

const DEFAULT_URL = "https://english-reading.test/api/test";

type TestRequestInit = Omit<RequestInit, "body"> & {
  url?: string | URL;
};

function toNextRequestInit(init: TestRequestInit) {
  const { url, signal, ...requestInit } = init;
  void url;

  return {
    ...requestInit,
    ...(signal ? { signal } : {}),
  };
}

export function createJsonRequest(body: unknown, init: TestRequestInit = {}) {
  return new NextRequest(init.url?.toString() ?? DEFAULT_URL, {
    ...toNextRequestInit(init),
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
    body: JSON.stringify(body),
  });
}

export function createFormDataRequest(formData: FormData, init: TestRequestInit = {}) {
  return new NextRequest(init.url?.toString() ?? DEFAULT_URL, {
    ...toNextRequestInit(init),
    method: init.method ?? "POST",
    body: formData,
  });
}

export function createFile(name: string, content: string, type = "text/plain") {
  return new File([content], name, { type });
}

export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function parseJsonResponse<T extends z.ZodType>(
  response: Response,
  schema: T,
): Promise<z.infer<T>> {
  return schema.parse(await readJsonResponse(response));
}
