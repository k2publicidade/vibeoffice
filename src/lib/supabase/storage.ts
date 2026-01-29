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

  // Obter URL pública/signed
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 60 * 60 * 24 * 7) // 7 dias

  if (!urlData) {
    throw new Error('Failed to get file URL')
  }

  return {
    path: data.path,
    url: urlData.signedUrl,
    size: file.size,
    mimeType: file.type,
  }
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
