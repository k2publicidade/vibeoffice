'use client'

import { useState, useEffect } from 'react'
import { AnnouncementCard } from './AnnouncementCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus, Megaphone } from 'lucide-react'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface AnnouncementsCarouselProps {
  className?: string
  onCreateClick?: () => void
  onEditClick?: (id: string) => void
  onArchiveClick?: (id: string) => void
}

export function AnnouncementsCarousel({
  className,
  onCreateClick,
  onEditClick,
  onArchiveClick,
}: AnnouncementsCarouselProps) {
  const { announcements, isLoading, archiveAnnouncement } = useAnnouncements()
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(0)

  // Determinar quantos cards mostrar por página baseado no tamanho da tela
  // Mobile: 1, Tablet: 2, Desktop: 3
  const [cardsPerPage, setCardsPerPage] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCardsPerPage(1) // Mobile
      } else if (window.innerWidth < 1024) {
        setCardsPerPage(2) // Tablet
      } else {
        setCardsPerPage(3) // Desktop
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calcular total de páginas
  const totalPages = Math.ceil(announcements.length / cardsPerPage)

  // Avisos da página atual
  const startIndex = currentPage * cardsPerPage
  const currentAnnouncements = announcements.slice(startIndex, startIndex + cardsPerPage)

  // Verificar se usuário pode gerenciar avisos
  const canManage = user?.role === 'Admin' || user?.role === 'Gerente'

  // Handlers de navegação
  const handlePrevious = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0))
  }

  const handleArchive = async (id: string) => {
    if (onArchiveClick) {
      onArchiveClick(id)
    } else {
      await archiveAnnouncement(id)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg hidden md:block" />
          <Skeleton className="h-64 rounded-lg hidden lg:block" />
        </div>
      </div>
    )
  }

  // Empty state
  if (announcements.length === 0) {
    return (
      <div className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
        <div className="relative rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 md:p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Nenhum aviso no momento</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quando houver avisos importantes da empresa, eles aparecerão aqui.
              </p>
            </div>
          </div>

          {/* Botão de criar (apenas Admin/Gerente) */}
          {canManage && onCreateClick && (
            <Button
              onClick={onCreateClick}
              className="mt-6"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Aviso
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
      {/* Container do Carrossel */}
      <div className="relative">
        {/* Botão de Criar (flutuante no canto superior direito) */}
        {canManage && onCreateClick && (
          <Button
            onClick={onCreateClick}
            size="sm"
            className="absolute -top-2 right-0 z-10 shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Novo Aviso</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
          <AnimatePresence mode="wait">
            {currentAnnouncements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1,
                }}
              >
                <AnnouncementCard
                  announcement={announcement}
                  onEdit={onEditClick}
                  onArchive={handleArchive}
                  canManage={canManage}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Navegação (apenas se houver mais de uma página) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            {/* Botão Anterior */}
            <Button
              onClick={handlePrevious}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Indicadores de página (dots) */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === currentPage
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`Ir para página ${index + 1}`}
                />
              ))}
            </div>

            {/* Botão Próximo */}
            <Button
              onClick={handleNext}
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Contador de avisos (mobile) */}
        <div className="flex items-center justify-center mt-4 md:hidden">
          <span className="text-xs text-muted-foreground">
            {announcements.length} {announcements.length === 1 ? 'aviso ativo' : 'avisos ativos'}
          </span>
        </div>
      </div>
    </div>
  )
}
