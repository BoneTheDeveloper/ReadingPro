import { expect } from "vitest";
import { expectApiErrorPayload } from "./assertions";

export async function expectJsonError(
  response: Response,
  status: number,
  message: string,
) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await response.json(), message);
}
