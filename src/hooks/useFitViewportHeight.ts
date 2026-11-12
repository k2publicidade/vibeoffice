'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Faz um elemento ocupar exatamente o espaço vertical restante da janela,
 * abaixo do header (cuja altura varia por breakpoint), descontando o
 * padding inferior do <main>. Enquanto montado, trava o scroll do documento
 * para que a página nunca exiba barra de rolagem própria.
 */
export function useFitViewportHeight<T extends HTMLElement>(minHeight = 260) {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    window.scrollTo(0, 0)

    const update = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      const main = el.closest('main')
      const paddingBottom = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0
      const marginBottom = parseFloat(getComputedStyle(el).marginBottom) || 0
      const viewport = window.innerHeight
      const next = Math.max(minHeight, Math.floor(viewport - top - paddingBottom - marginBottom))
      setHeight(prev => (prev === next ? prev : next))
    }

    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    const header = document.querySelector('header')
    if (header) observer.observe(header)

    return () => {
      html.style.overflow = previousOverflow
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [minHeight])

  return { ref, height }
}
