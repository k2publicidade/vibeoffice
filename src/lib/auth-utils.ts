/**
 * Auth Utilities
 * Funções auxiliares para autenticação e redirecionamento baseado em role
 */

import { Role } from '@/types/auth'

/**
 * Retorna a rota do dashboard baseado na role do usuário
 */
export function getDashboardRoute(role: Role): string {
  const dashboardRoutes: Record<Role, string> = {
    'Admin': '/',
    'Gerente': '/',
    'Colaborador': '/',
  }

  return dashboardRoutes[role] || '/'
}

/**
 * Verifica se o usuário tem permissão para acessar uma rota
 */
export function canAccessRoute(
  userRole: Role,
  requiredRole?: Role
): boolean {
  if (!requiredRole) return true

  const roleHierarchy: Record<Role, number> = {
    'Colaborador': 0,
    'Gerente': 1,
    'Admin': 2,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
