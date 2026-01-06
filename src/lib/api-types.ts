/**
 * API Types
 * Tipos TypeScript e endpoints da API
 */

/**
 * Resposta padrão da API
 */
export interface APIResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Configuração de requisição customizada
 */
export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  signal?: AbortSignal
}

/**
 * Endpoints organizados por módulo
 */
export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Usuários
  USERS: {
    LIST: '/users',
    GET: (id: string) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    BY_SECTOR: (sector: string) => `/users/sector/${sector}`,
    CHANGE_PASSWORD: (id: string) => `/users/${id}/change-password`,
    AVATAR: (id: string) => `/users/${id}/avatar`,
  },

  // Tickets
  TICKETS: {
    LIST: '/tickets',
    GET: (id: string) => `/tickets/${id}`,
    CREATE: '/tickets',
    UPDATE: (id: string) => `/tickets/${id}`,
    DELETE: (id: string) => `/tickets/${id}`,
    BY_STATUS: (status: string) => `/tickets/status/${status}`,
    BY_SECTOR: (sector: string) => `/tickets/sector/${sector}`,
    BY_USER: (userId: string) => `/tickets/user/${userId}`,
    HISTORY: (id: string) => `/tickets/${id}/history`,
    ADD_COMMENT: (id: string) => `/tickets/${id}/comments`,
    CHANGE_STATUS: (id: string) => `/tickets/${id}/status`,
    ASSIGN: (id: string) => `/tickets/${id}/assign`,
  },

  // Tarefas
  TASKS: {
    LIST: '/tasks',
    GET: (id: string) => `/tasks/${id}`,
    CREATE: '/tasks',
    UPDATE: (id: string) => `/tasks/${id}`,
    DELETE: (id: string) => `/tasks/${id}`,
    BY_STATUS: (status: string) => `/tasks/status/${status}`,
    BY_SECTOR: (sector: string) => `/tasks/sector/${sector}`,
    BY_USER: (userId: string) => `/tasks/user/${userId}`,
    REORDER: '/tasks/reorder',
    CHANGE_STATUS: (id: string) => `/tasks/${id}/status`,
    ASSIGN: (id: string) => `/tasks/${id}/assign`,
  },

  // Chat
  CHAT: {
    ROOMS: '/chat/rooms',
    ROOM: (id: string) => `/chat/rooms/${id}`,
    MESSAGES: (roomId: string) => `/chat/rooms/${roomId}/messages`,
    SEND_MESSAGE: (roomId: string) => `/chat/rooms/${roomId}/messages`,
    DMS: '/chat/dms',
    DM: (userId: string) => `/chat/dms/${userId}`,
    TYPING: (roomId: string) => `/chat/rooms/${roomId}/typing`,
    MARK_READ: (roomId: string) => `/chat/rooms/${roomId}/read`,
  },

  // Drive
  DRIVE: {
    FOLDERS: '/drive/folders',
    FOLDER: (id: string) => `/drive/folders/${id}`,
    CREATE_FOLDER: '/drive/folders',
    UPDATE_FOLDER: (id: string) => `/drive/folders/${id}`,
    DELETE_FOLDER: (id: string) => `/drive/folders/${id}`,
    FILES: '/drive/files',
    FILE: (id: string) => `/drive/files/${id}`,
    UPLOAD: '/drive/files/upload',
    DOWNLOAD: (id: string) => `/drive/files/${id}/download`,
    DELETE_FILE: (id: string) => `/drive/files/${id}`,
    SHARE: (id: string) => `/drive/files/${id}/share`,
    BY_SECTOR: (sector: string) => `/drive/sector/${sector}`,
  },

  // Cursos
  COURSES: {
    LIST: '/courses',
    GET: (id: string) => `/courses/${id}`,
    CREATE: '/courses',
    UPDATE: (id: string) => `/courses/${id}`,
    DELETE: (id: string) => `/courses/${id}`,
    LESSONS: (courseId: string) => `/courses/${courseId}/lessons`,
    LESSON: (courseId: string, lessonId: string) => `/courses/${courseId}/lessons/${lessonId}`,
    MARK_COMPLETE: (courseId: string, lessonId: string) =>
      `/courses/${courseId}/lessons/${lessonId}/complete`,
    PROGRESS: (courseId: string, userId: string) => `/courses/${courseId}/progress/${userId}`,
    ENROLL: (courseId: string) => `/courses/${courseId}/enroll`,
    UNENROLL: (courseId: string) => `/courses/${courseId}/unenroll`,
  },

  // Agenda/Calendário
  CALENDAR: {
    EVENTS: '/calendar/events',
    EVENT: (id: string) => `/calendar/events/${id}`,
    CREATE: '/calendar/events',
    UPDATE: (id: string) => `/calendar/events/${id}`,
    DELETE: (id: string) => `/calendar/events/${id}`,
    BY_DATE_RANGE: '/calendar/events/range',
    BY_TYPE: (type: string) => `/calendar/events/type/${type}`,
    BY_SECTOR: (sector: string) => `/calendar/events/sector/${sector}`,
    BY_USER: (userId: string) => `/calendar/events/user/${userId}`,
  },
} as const

/**
 * Tipo helper para extrair endpoints dinâmicos
 */
export type Endpoint = string | ((param: string) => string)
