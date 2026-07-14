const SOURCE_LABELS: Record<string, Record<string, string>> = {
  seed: {
    "seed:reviewed": "Dictionary",
    "seed:core": "Core Vocabulary",
    default: "Seed Data",
  },
  manual: { default: "Manual Entry" },
  provider: { default: "Provider" },
  llm: { default: "AI Generated" },
  mixed: { default: "Mixed Source" },
};

export function getSourceLabel(sourceType: string, sourceName: string | null): string {
  const typeGroup = SOURCE_LABELS[sourceType];
  if (!typeGroup) return sourceType;
  if (sourceName && typeGroup[`${sourceType}:${sourceName}`]) {
    return typeGroup[`${sourceType}:${sourceName}`];
  }
  if (sourceName) return sourceName;
  return typeGroup.default ?? sourceType;
}

export const RUNTIME_STATUSES = ["reviewed", "approved"] as const;

export const VALID_TRANSLATION_STATUSES = ["draft", "reviewed", "approved", "deprecated"] as const;
export const VALID_SOURCE_TYPES = ["seed", "manual", "provider", "llm", "mixed"] as const;
