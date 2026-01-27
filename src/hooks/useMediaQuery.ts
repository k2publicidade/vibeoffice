'use client'

import { useState, useEffect } from 'react'

/**
 * Hook para detectar media queries de forma reativa
 * @param query - Media query string (ex: '(min-width: 768px)')
 * @returns boolean indicando se a query corresponde
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Verificar se estamos no browser
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Definir valor inicial
    setMatches(mediaQuery.matches)

    // Handler para mudanças
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Adicionar listener
    mediaQuery.addEventListener('change', handleChange)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
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
