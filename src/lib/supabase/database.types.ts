/**
 * Supabase Database TypeScript Types
 * Será gerado automaticamente após criar schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Será preenchido após migrations
    }
    Views: {
      // Será preenchido se necessário
    }
    Functions: {
      // Será preenchido se necessário
    }
    Enums: {
      // Será preenchido após migrations
    }
  }
}
