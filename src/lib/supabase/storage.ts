/**
 * Supabase Storage Helpers
 * Funções para gerenciar uploads/downloads de arquivos
 */

import { createClient } from './client'

export interface UploadFileOptions {
  file: File
  bucket: string
  path: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  path: string
  url: string
  size: number
  mimeType: string
}

/**
 * Upload de arquivo com progresso
 */
export async function uploadFile({
  file,
  bucket,
  path,
  onProgress,
}: UploadFileOptions): Promise<UploadResult> {
  const supabase = createClient()

  // Upload do arquivo
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return {
    path: data.path,
    url: `storage://${bucket}/${data.path}`,
    size: file.size,
    mimeType: file.type,
  }
}

/** Store a stable reference; sign it again each time authenticated data is loaded. */
export function storageReference(url: string): string {
  if (!url || url.startsWith('storage://')) return url
  try {
    const parsed = new URL(url)
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const match = parsed.pathname.match(/^\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/)
    if (parsed.origin === base.origin && match) return `storage://${match[1]}/${decodeURIComponent(match[2])}`
  } catch { /* External URL or existing storage reference. */ }
  return url
}

export async function resolveStorageUrl(url?: string | null): Promise<string | undefined> {
  if (!url) return undefined
  const reference = storageReference(url)
  const match = reference.match(/^storage:\/\/([^/]+)\/(.+)$/)
  if (!match) return url
  return getSignedUrl(match[1], match[2], 60 * 60 * 8)
}

/**
 * Obter URL assinada de arquivo
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Deletar arquivo
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Listar arquivos em um diretório
 */
export async function listFiles(bucket: string, path: string = '') {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).list(path)

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data
}
