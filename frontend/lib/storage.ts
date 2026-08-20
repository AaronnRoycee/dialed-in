import type { SupabaseClient } from '@supabase/supabase-js'

export function uploadMediaPath(
  householdId: string,
  entityType: string,
  entityId: string,
  fileName: string
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9.-]/g, '-')
  return `households/${householdId}/${entityType}/${entityId}/${Date.now()}-${safe}`
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function getSignedUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrls(paths, 3600)
  if (error || !data) return {}
  return data.reduce<Record<string, string>>((acc, item) => {
    const signed = item as { path?: string | null; signedUrl?: string | null }
    if (signed.path && signed.signedUrl) {
      acc[signed.path] = signed.signedUrl
    }
    return acc
  }, {})
}
