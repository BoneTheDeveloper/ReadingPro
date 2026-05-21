import { vi } from "vitest";

const defaultGeneratedObject: unknown = {
  simplifiedText: "A clear test passage.",
  changes: ["Shortened sentences."],
  retainedKeyTerms: ["test"],
};

export const generateObject = vi.fn<() => Promise<{ object: unknown }>>(
  async () => ({ object: defaultGeneratedObject })
);

export const streamText = vi.fn<() => { toUIMessageStreamResponse: () => Response }>(() => ({
  toUIMessageStreamResponse: vi.fn(() => new Response("test stream")),
}));

export const convertToModelMessages = vi.fn(async (messages: unknown) => messages);

export function mockGenerateObjectOnce(object: unknown) {
  generateObject.mockResolvedValueOnce({ object });
}

export function mockStreamTextOnce(response: Response) {
  streamText.mockReturnValueOnce({
    toUIMessageStreamResponse: vi.fn(() => response),
  });
}

export function resetAiMocks() {
  generateObject.mockReset();
  generateObject.mockResolvedValue({ object: defaultGeneratedObject });
  streamText.mockReset();
  streamText.mockReturnValue({
    toUIMessageStreamResponse: vi.fn(() => new Response("test stream")),
  });
  convertToModelMessages.mockReset();
  convertToModelMessages.mockImplementation(async (messages: unknown) => messages);
}
