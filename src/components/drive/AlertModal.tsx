'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Loader2,
  Trash2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'delete'

interface AlertModalProps {
  open: boolean
  onClose: () => void
  type?: AlertType
  title: string
  description?: string
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  isLoading?: boolean
  showCancel?: boolean
}

const alertConfig = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    gradient: 'from-emerald-500/20 to-teal-500/5'
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    buttonClass: 'bg-red-600 hover:bg-red-500 text-white',
    gradient: 'from-red-500/20 to-orange-500/5'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    buttonClass: 'bg-amber-600 hover:bg-amber-500 text-white',
    gradient: 'from-amber-500/20 to-yellow-500/5'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    gradient: 'from-blue-500/20 to-sky-500/5'
  },
  confirm: {
    icon: Info,
    iconColor: 'text-[#fc7a67]',
    bgColor: 'bg-[#fc7a67]/10',
    borderColor: 'border-[#fc7a67]/20',
    buttonClass: 'bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:shadow-lg text-white',
    gradient: 'from-[#fc7a67]/20 to-[#ff0300]/5'
  },
  delete: {
    icon: Trash2,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    buttonClass: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20',
    gradient: 'from-red-500/20 to-pink-500/5'
  }
}

export function AlertModal({
  open,
  onClose,
  type = 'info',
  title,
  description,
  children,
  confirmText = 'OK',
  cancelText = 'Cancelar',
  onConfirm,
  isLoading = false,
  showCancel = false,
}: AlertModalProps) {
  const config = alertConfig[type]
  const Icon = config.icon

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm()
    }
    if (!isLoading) {
      onClose()
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-900 p-0 overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {/* Decorative background */}
            <div className={cn("absolute inset-0 bg-gradient-to-b opacity-50 pointer-events-none", config.gradient)} />

            <div className="relative z-10 p-6 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className={cn('p-4 rounded-full mb-5 border', config.bgColor, config.borderColor)}
              >
                <Icon className={cn('h-8 w-8', config.iconColor)} />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">
                {title}
              </h2>

              {description && (
                <p className="text-sm text-zinc-400 leading-relaxed max-w-[90%]">
                  {description}
                </p>
              )}

              {children && (
                <div className="mt-4 w-full text-left">
                  {children}
                </div>
              )}
            </div>

            <div className={cn(
              'relative z-10 flex gap-3 p-4 bg-zinc-900/50 border-t border-zinc-900',
              showCancel || type === 'confirm' || type === 'delete' ? 'justify-between' : 'justify-center'
            )}>
              {(showCancel || type === 'confirm' || type === 'delete') && (
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  {cancelText}
                </Button>
              )}

              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  'flex-1 font-medium transition-all duration-200',
                  config.buttonClass,
                  isLoading && "opacity-80"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// Componente de confirmação de exclusão específico
interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  itemName: string
  itemType: 'file' | 'folder'
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function DeleteConfirmModal({
  open,
  onClose,
  itemName,
  itemType,
  onConfirm,
  isLoading = false,
}: DeleteConfirmModalProps) {
  return (
    <AlertModal
      open={open}
      onClose={onClose}
      type="delete"
      title={`Excluir ${itemType === 'folder' ? 'pasta' : 'arquivo'}?`}
      description={`Tem certeza que deseja excluir "${itemName}"? ${itemType === 'folder' ? 'Isso APAGARÁ PERMANENTEMENTE todos os arquivos dentro dela.' : 'Esta ação não pode ser desfeita.'
        }`}
      confirmText="Sim, excluir"
      cancelText="Cancelar"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  )
}

// Componente de sucesso
interface SuccessModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
}

export function SuccessModal({
  open,
  onClose,
  title,
  description,
}: SuccessModalProps) {
  return (
    <AlertModal
      open={open}
      onClose={onClose}
      type="success"
      title={title}
      description={description}
      confirmText="Continuar"
    />
  )
}

// Componente de erro
interface ErrorModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
}

export function ErrorModal({
  open,
  onClose,
  title,
  description,
}: ErrorModalProps) {
  return (
    <AlertModal
      open={open}
      onClose={onClose}
      type="error"
      title={title}
      description={description}
      confirmText="Entendi"
    />
  )
}
