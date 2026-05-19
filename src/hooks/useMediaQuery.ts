'use client'

import { useSyncExternalStore } from 'react'

/**
 * Hook para detectar media queries de forma reativa.
 * Usa useSyncExternalStore — sem setState em effect, sem cascading renders.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === 'undefined') return () => {}
    const mql = window.matchMedia(query)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }

  const getSnapshot = () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook para detectar se está em mobile (< 768px)
 * @returns boolean - true se viewport é mobile
 */
export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)')
}

/**
 * Hook para detectar se está em tablet (768px - 1023px)
 * @returns boolean - true se viewport é tablet
 */
export function useIsTablet(): boolean {
  const isMinTablet = useMediaQuery('(min-width: 768px)')
  const isMaxTablet = !useMediaQuery('(min-width: 1024px)')
  return isMinTablet && isMaxTablet
}

/**
 * Hook para detectar se está em desktop (>= 1024px)
 * @returns boolean - true se viewport é desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * Breakpoints padrão do Tailwind
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const
