import type { UserProfile } from '@/generated/prisma/client';

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { profile: UserProfile; expiresAt: number }>();

export function getCachedProfile(accessToken: string): UserProfile | null {
  const entry = cache.get(accessToken);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(accessToken);
    return null;
  }
  return entry.profile;
}

export function setCachedProfile(accessToken: string, profile: UserProfile): void {
  // Prevent unbounded growth — evict expired entries on write
  if (cache.size > 1000) {
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= Date.now()) cache.delete(key);
    }
  }
  cache.set(accessToken, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
}
