/**
 * Zod Validation Schemas
 *
 * Schemas de validação para todas as entidades do sistema.
 * Garante que dados são validados antes de serem enviados ao Supabase.
 */

import { z } from 'zod'

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título muito longo (máx. 200 caracteres)'),

  description: z.string()
    .max(2000, 'Descrição muito longa (máx. 2000 caracteres)')
    .optional(),

  status: z.enum(['todo', 'in_progress', 'done']),

  priority: z.enum(['low', 'medium', 'high']),

  sector: z.enum([
    'A&R',
    'Marketing',
    'Financeiro',
    'Jurídico',
    'Administrativo',
    'TI/Suporte',
    'Atendimento ao Artista'
  ]),

  assignedTo: z.string().uuid('ID de usuário inválido').optional(),

  dueDate: z.date().optional(),

  tags: z.array(z.string().max(50)).max(10, 'Máximo 10 tags').optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

export const CreateTicketSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título muito longo (máx. 200 caracteres)'),

  description: z.string()
    .min(10, 'Descrição muito curta (mín. 10 caracteres)')
    .max(5000, 'Descrição muito longa (máx. 5000 caracteres)'),

  category: z.enum([
    'A&R',
    'Marketing',
    'Financeiro',
    'Jurídico',
    'Administrativo',
    'TI/Suporte',
    'Atendimento ao Artista'
  ]),

  priority: z.enum(['low', 'medium', 'high']),

  status: z.enum(['open', 'analyzing', 'in_progress', 'completed']).optional(),

  assignedTo: z.string().uuid('ID de usuário inválido').optional(),

  requester: z.string().uuid('ID de usuário inválido'),
})

export const UpdateTicketSchema = CreateTicketSchema.partial().omit({ requester: true })

export const CreateTicketCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comentário não pode estar vazio')
    .max(2000, 'Comentário muito longo (máx. 2000 caracteres)'),

  isInternal: z.boolean().optional().default(false),
})

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>
export type CreateTicketCommentInput = z.infer<typeof CreateTicketCommentSchema>

// ============================================================================
// DRIVE SCHEMAS
// ============================================================================

export const CreateDriveItemSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome muito longo (máx. 255 caracteres)')
    .regex(/^[^<>:"/\\|?*]+$/, 'Nome contém caracteres inválidos'),

  type: z.enum(['file', 'folder']),

  path: z.string().max(1000, 'Caminho muito longo'),

  size: z.number()
    .int()
    .min(0)
    .max(100 * 1024 * 1024, 'Arquivo muito grande (máx. 100MB)')
    .optional(),

  mimeType: z.string().max(100).optional(),

  parentId: z.string().uuid().nullable().optional(),

  sector: z.enum([
    'A&R',
    'Marketing',
    'Financeiro',
    'Jurídico',
    'Administrativo',
    'TI/Suporte',
    'Atendimento ao Artista'
  ]),
})

export const ShareDriveItemSchema = z.object({
  itemId: z.string().uuid('ID de item inválido'),
  userId: z.string().uuid('ID de usuário inválido'),
  permission: z.enum(['view', 'edit', 'manage']),
})

export type CreateDriveItemInput = z.infer<typeof CreateDriveItemSchema>
export type ShareDriveItemInput = z.infer<typeof ShareDriveItemSchema>

// ============================================================================
// CALENDAR SCHEMAS
// ============================================================================

const CalendarEventBaseSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título muito longo (máx. 200 caracteres)'),

  description: z.string()
    .max(2000, 'Descrição muito longa (máx. 2000 caracteres)')
    .optional(),

  startTime: z.date(),

  endTime: z.date(),

  type: z.enum(['personal', 'sector', 'company']),

  location: z.string().max(200, 'Localização muito longa').optional(),

  attendees: z.array(z.string().uuid()).max(50, 'Máximo 50 participantes').optional(),
})

export const CreateCalendarEventSchema = CalendarEventBaseSchema.refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'Data de término deve ser após data de início',
    path: ['endTime'],
  }
)

export const UpdateCalendarEventSchema = CalendarEventBaseSchema.partial()

export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const CreateChatMessageSchema = z.object({
  content: z.string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(5000, 'Mensagem muito longa (máx. 5000 caracteres)'),

  roomId: z.string().uuid('ID de sala inválido'),

  replyTo: z.string().uuid('ID de mensagem inválido').optional(),
})

export type CreateChatMessageInput = z.infer<typeof CreateChatMessageSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Valida dados com um schema Zod e retorna resultado tipado
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error }
  }
}

/**
 * Formata erros do Zod para mensagens legíveis
 */
export function formatZodErrors(error: z.ZodError<any>): string[] {
  return error.issues.map(err => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
}

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

/**
 * Schema de validação para Login
 */
export const LoginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),

  password: z.string()
    .min(1, 'Senha é obrigatória'),
})

/**
 * Schema de validação para Signup
 * Regras:
 * - Email válido
 * - Senha >= 8 caracteres com maiúsculas, minúsculas e números
 * - Nome >= 2 caracteres
 * - Confirmação de senha deve coincidir
 */
export const SignupSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório'),

  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números'
    ),

  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),

  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SignupInput = z.infer<typeof SignupSchema>
