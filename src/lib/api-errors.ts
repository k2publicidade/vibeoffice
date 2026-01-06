/**
 * API Error Classes
 * Classes customizadas para tratamento de erros da API
 */

/**
 * Erro base da API
 */
export class APIError extends Error {
  public status: number
  public code?: string
  public details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Erro de rede (timeout, conexão)
 */
export class NetworkError extends APIError {
  constructor(message = 'Erro de conexão. Verifique sua internet.') {
    super(message, 0, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

/**
 * Erro de validação (400)
 */
export class ValidationError extends APIError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Erro de autenticação (401)
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Não autenticado. Faça login novamente.') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

/**
 * Erro de autorização (403)
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Você não tem permissão para acessar este recurso.') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
export class NotFoundError extends APIError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

/**
 * Erro do servidor (500+)
 */
export class ServerError extends APIError {
  constructor(message = 'Erro interno do servidor. Tente novamente mais tarde.') {
    super(message, 500, 'SERVER_ERROR')
    this.name = 'ServerError'
  }
}

/**
 * Handler central para tratar erros da API
 */
export function handleAPIError(error: unknown): never {
  // Erro de rede (timeout, sem conexão)
  if (error instanceof Error) {
    if (
      error.message.includes('Network Error') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED')
    ) {
      throw new NetworkError()
    }
  }

  // Erro já tratado
  if (error instanceof APIError) {
    throw error
  }

  // Erro do axios com resposta
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: {
        status: number
        data?: {
          message?: string
          error?: string
          details?: unknown
        }
      }
      message: string
    }

    const status = axiosError.response?.status || 500
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'Erro desconhecido'
    const details = axiosError.response?.data?.details

    // Mapear por status code
    switch (status) {
      case 400:
        throw new ValidationError(message, details)
      case 401:
        throw new AuthenticationError(message)
      case 403:
        throw new AuthorizationError(message)
      case 404:
        throw new NotFoundError(message)
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(message)
      default:
        throw new APIError(message, status, 'UNKNOWN_ERROR', details)
    }
  }

  // Erro desconhecido
  throw new APIError('Erro desconhecido', 500, 'UNKNOWN_ERROR')
}
