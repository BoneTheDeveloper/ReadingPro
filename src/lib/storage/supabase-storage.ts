import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createModuleLogger } from '@/lib/core/logger';

const log = createModuleLogger('storage:supabase');

const BUCKET_NAME = 'content-uploads';

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

export async function uploadFile(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; path: string } | null> {
  const client = getClient();
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, { contentType, upsert: false });

  if (error) {
    log.error({ err: error, filename }, 'Storage upload failed');
    return null;
  }

  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl, path: data.path };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const client = getClient();
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);

  if (error) {
    log.error({ err: error, path }, 'Signed URL generation failed');
    return null;
  }

  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<boolean> {
  const client = getClient();
  const { error } = await client.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    log.error({ err: error, path }, 'Storage delete failed');
    return false;
  }

  return true;
}
