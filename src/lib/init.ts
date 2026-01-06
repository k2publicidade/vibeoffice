/**
 * Application Initialization
 * Executado uma única vez quando a aplicação começa
 */

import { validateEnvironmentVariables } from './env'

// Validar variáveis de ambiente na inicialização
// Isso garante que erros de configuração sejam detectados ANTES de qualquer requisição
let initialized = false

export function initializeApp() {
  if (initialized) return

  if (typeof window === 'undefined') {
    // Server-side: validar todas as variáveis
    validateEnvironmentVariables()
  }

  initialized = true
}
