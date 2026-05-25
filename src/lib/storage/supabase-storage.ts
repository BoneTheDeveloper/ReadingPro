import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('storage:supabase');

const BUCKET_NAME = 'content-uploads';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

function invalidateClient(): void {
  supabase = null;
}

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = (error as { message?: string }).message?.toLowerCase() ?? '';
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('fetchfailed') ||
    msg.includes('503') ||
    msg.includes('502')
  );
}

async function withRetry<T>(
  operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>,
  label: string,
): Promise<{ data: T | null; error: unknown }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getClient();
      const result = await operation(client);

      if (!result.error) return result;
      lastError = result.error;

      if (isTransientError(result.error) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        log.warn(
          { err: result.error, context: { attempt, retryIn: delay, label } },
          `${label} failed, retrying`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        invalidateClient();
        continue;
      }

      return result;
    } catch (err) {
      lastError = err;
      if (isTransientError(err) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        log.warn(
          { err, context: { attempt, retryIn: delay, label } },
          `${label} threw, retrying`,
        );
        invalidateClient();
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }

  return { data: null, error: lastError };
}

export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string; path: string } | null> {
  const { data, error } = await withRetry<{ path: string }>(
    (client) => client.storage.from(BUCKET_NAME).upload(filename, buffer, { contentType, upsert: false }),
    'Storage upload',
  );

  if (error || !data) {
    log.error(
      { err: error, context: { filename, bucket: BUCKET_NAME } },
      'Storage upload failed after retries',
    );
    return null;
  }

  const client = getClient();
  const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return { url: urlData.publicUrl, path: data.path };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await withRetry<{ signedUrl: string }>(
    (client) => client.storage.from(BUCKET_NAME).createSignedUrl(path, 3600),
    'Signed URL',
  );

  if (error || !data) {
    log.error(
      { err: error, context: { path, bucket: BUCKET_NAME } },
      'Signed URL generation failed after retries',
    );
    return null;
  }

  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<boolean> {
  const { error } = await withRetry<unknown>(
    (client) => client.storage.from(BUCKET_NAME).remove([path]),
    'Storage delete',
  );

  if (error) {
    log.error(
      { err: error, context: { path, bucket: BUCKET_NAME } },
      'Storage delete failed after retries',
    );
    return false;
  }

  return true;
}
