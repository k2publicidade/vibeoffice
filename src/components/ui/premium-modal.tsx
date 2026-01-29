'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface PremiumModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  mobileFullScreen?: boolean
  title?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
}

// Premium spring animation config
const springConfig = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
}

export function PremiumModal({
  open,
  onClose,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  mobileFullScreen = false,
  title,
}: PremiumModalProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute inset-0 bg-black/60 backdrop-blur-sm',
              mobileFullScreen && 'md:block hidden'
            )}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={springConfig}
            className={cn(
              'relative z-10 w-full',
              // Mobile full screen
              mobileFullScreen
                ? 'fixed inset-0 md:relative md:inset-auto md:mx-4'
                : 'mx-4',
              !mobileFullScreen && sizeClasses[size],
              mobileFullScreen && `md:${sizeClasses[size]}`,
              // Dark mode only
              'bg-zinc-900',
              'text-foreground',
              // Premium styling
              mobileFullScreen
                ? 'rounded-none md:rounded-3xl'
                : 'rounded-3xl',
              'shadow-2xl',
              'border-0 md:border md:border-zinc-800',
              mobileFullScreen ? 'p-0 md:p-6' : 'p-6',
              // Mobile full height
              mobileFullScreen &&
                'flex flex-col h-full md:h-auto md:max-h-[90vh]',
              className
            )}
          >
            {/* Subtle gradient accent at top - desktop only when mobile fullscreen */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-80',
                mobileFullScreen
                  ? 'hidden md:block md:rounded-t-3xl'
                  : 'rounded-t-3xl'
              )}
            />

            {/* Mobile Header - only when mobileFullScreen is true */}
            {mobileFullScreen && (
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors -ml-2"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                {title && (
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                )}
                <div className="w-11" /> {/* Spacer for centering */}
              </div>
            )}

            {/* Close button - desktop */}
            {showCloseButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                onClick={onClose}
                className={cn(
                  'absolute top-4 right-4',
                  'h-9 w-9 rounded-full',
                  'flex items-center justify-center',
                  'bg-muted hover:bg-muted/80',
                  'text-muted-foreground hover:text-foreground',
                  'transition-all duration-200',
                  'hover:scale-110 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  mobileFullScreen && 'hidden md:flex'
                )}
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {/* Content with staggered animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className={cn(
                mobileFullScreen &&
                  'flex-1 overflow-y-auto px-4 py-4 md:px-0 md:py-0'
              )}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Sub-components for structured content
export function PremiumModalHeader({
  className,
  children,
  hiddenOnMobileFullScreen = false,
}: {
  className?: string
  children: React.ReactNode
  hiddenOnMobileFullScreen?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        'mb-6',
        hiddenOnMobileFullScreen && 'hidden md:block',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export function PremiumModalTitle({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h2 className={cn('text-2xl font-bold tracking-tight', className)}>
      {children}
    </h2>
  )
}

export function PremiumModalDescription({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)}>
      {children}
    </p>
  )
}

export function PremiumModalBody({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={cn('space-y-4', className)}
    >
      {children}
    </motion.div>
  )
}

export function PremiumModalFooter({
  className,
  children,
  stickyOnMobile = false,
}: {
  className?: string
  children: React.ReactNode
  stickyOnMobile?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={cn(
        'mt-6 flex justify-end gap-3',
        stickyOnMobile &&
          'sticky bottom-0 bg-zinc-900 py-4 -mx-4 px-4 md:relative md:bottom-auto md:bg-transparent md:py-0 md:mx-0 md:px-0 border-t border-zinc-800 md:border-0',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
