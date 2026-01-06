/**
 * Zod Schemas - Validação de dados
 * Centraliza todos os schemas de validação para o projeto
 */

import { z } from 'zod'

/* ============================================
   AUTH SCHEMAS
   ============================================ */

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginInput = z.infer<typeof LoginSchema>

/* ============================================
   TASK SCHEMAS
   ============================================ */

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Máximo 200 caracteres'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assignedTo: z.string().min(1, 'Responsável é obrigatório'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
})

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>

export const UpdateTaskSchema = CreateTaskSchema.partial()

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

/* ============================================
   TICKET SCHEMAS
   ============================================ */

export const CreateTicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  priority: z.enum(['low', 'medium', 'high']),
})

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>

export const UpdateTicketSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'analyzing', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.string().optional(),
})

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>

/* ============================================
   CHAT SCHEMAS
   ============================================ */

export const SendMessageSchema = z.object({
  roomId: z.string().min(1, 'Room ID é obrigatório'),
  content: z.string().min(1, 'Mensagem não pode estar vazia').max(1000, 'Máximo 1000 caracteres'),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>

/* ============================================
   CALENDAR SCHEMAS
   ============================================ */

export const CreateEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  startTime: z.string().datetime('Data/hora de início inválida'),
  endTime: z.string().datetime('Data/hora de fim inválida'),
  type: z.enum(['personal', 'sector', 'company']),
  sector: z.string().optional(),
  attendees: z.array(z.string()).optional(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>

export const UpdateEventSchema = CreateEventSchema.partial()

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>

/* ============================================
   DRIVE SCHEMAS
   ============================================ */

export const CreateFolderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  parentId: z.string().optional(),
})

export type CreateFolderInput = z.infer<typeof CreateFolderSchema>

export const UploadFileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  parentId: z.string().optional(),
  size: z.number().max(10 * 1024 * 1024, 'Arquivo muito grande (máx 10MB)'),
})

export type UploadFileInput = z.infer<typeof UploadFileSchema>
