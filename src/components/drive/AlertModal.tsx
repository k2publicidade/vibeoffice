'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

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
    iconColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    buttonClass: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  },
  confirm: {
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    buttonClass: 'bg-gradient-to-r from-[#fc7a67] to-[#ff0300] hover:from-[#ff0300] hover:to-[#fc7a67]',
  },
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] bg-black border-[#262626] p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header com ícone */}
            <div className={cn(
              'flex flex-col items-center justify-center p-6 pb-4 border-b',
              config.borderColor,
              config.bgColor
            )}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className={cn('p-4 rounded-full mb-4', config.bgColor)}
              >
                <Icon className={cn('h-10 w-10', config.iconColor)} />
              </motion.div>
              <DialogHeader className="text-center space-y-2">
                <DialogTitle className="text-xl font-semibold text-white">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="text-gray-400 text-sm">
                    {description}
                  </DialogDescription>
                )}
              </DialogHeader>
            </div>

            {/* Content customizado */}
            {children && (
              <div className="p-4 border-b border-[#262626]">
                {children}
              </div>
            )}

            {/* Actions */}
            <div className={cn(
              'flex items-center p-4 gap-3',
              showCancel || type === 'confirm' ? 'justify-between' : 'justify-center'
            )}>
              {(showCancel || type === 'confirm') && (
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 border-[#262626] text-white hover:bg-[#1a1a1a] hover:text-white"
                >
                  {cancelText}
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  'flex-1 text-white gap-2',
                  config.buttonClass
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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
      type="confirm"
      title={`Excluir ${itemType === 'folder' ? 'pasta' : 'arquivo'}?`}
      description={`Tem certeza que deseja excluir "${itemName}"? ${
        itemType === 'folder' ? 'Todos os arquivos dentro da pasta também serão excluídos.' : ''
      } Esta ação não pode ser desfeita.`}
      confirmText="Excluir"
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
      confirmText="OK"
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
