'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateTicketSchema, type CreateTicketInput } from '@/lib/schemas'
import { TicketPriority } from '@/types/tickets'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Ticket,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CreateTicketModalProps {
  open: boolean
  onClose: () => void
  onCreateTicket: (data: CreateTicketInput) => void
}

const TICKET_CATEGORIES = [
  { value: 'Financeiro', label: 'Financeiro', icon: '💰' },
  { value: 'Administrativo', label: 'Administrativo', icon: '📋' },
  { value: 'Jurídico', label: 'Jurídico', icon: '⚖️' },
  { value: 'TI/Suporte', label: 'TI/Suporte', icon: '🖥️' },
  { value: 'RH', label: 'Recursos Humanos', icon: '👥' },
  { value: 'Marketing', label: 'Marketing', icon: '📢' },
]

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'low',
    label: 'Baixa',
    icon: <ArrowDown className="h-4 w-4" />,
    color: 'text-green-500 bg-green-500/10 border-green-500/30',
  },
  {
    value: 'medium',
    label: 'Média',
    icon: <ArrowRight className="h-4 w-4" />,
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  },
  {
    value: 'high',
    label: 'Alta',
    icon: <ArrowUp className="h-4 w-4" />,
    color: 'text-red-500 bg-red-500/10 border-red-500/30',
  },
]

export function CreateTicketModal({ open, onClose, onCreateTicket }: CreateTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('medium')

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
    },
  })

  const handlePriorityChange = (priority: TicketPriority) => {
    setSelectedPriority(priority)
    setValue('priority', priority)
  }

  const onSubmit = async (data: CreateTicketInput) => {
    setIsSubmitting(true)

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 800))

    try {
      onCreateTicket(data)
      toast.success('Ticket criado com sucesso!', {
        description: `"${data.title}" foi adicionado à fila.`,
      })
      reset()
      setSelectedPriority('medium')
      onClose()
    } catch {
      toast.error('Erro ao criar ticket', {
        description: 'Tente novamente em alguns instantes.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      setSelectedPriority('medium')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-black border-[#262626] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-[#fc7a67]/10">
              <Ticket className="h-5 w-5 text-[#fc7a67]" />
            </div>
            Nova Solicitação
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Preencha os detalhes do seu ticket para que possamos ajudá-lo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Descreva brevemente o problema ou solicitação"
              {...register('title')}
              className={cn(
                'bg-[#1a1a1a] border-[#262626] focus:border-[#fc7a67] focus:ring-[#fc7a67]/20',
                errors.title && 'border-red-500 focus:border-red-500'
              )}
            />
            {errors.title && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {errors.title.message}
              </motion.p>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger
                className={cn(
                  'bg-[#1a1a1a] border-[#262626] focus:border-[#fc7a67] focus:ring-[#fc7a67]/20',
                  errors.category && 'border-red-500'
                )}
              >
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#262626]">
                {TICKET_CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="focus:bg-[#fc7a67]/10 focus:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {errors.category.message}
              </motion.p>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Prioridade <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-3">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => handlePriorityChange(priority.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all duration-200',
                    selectedPriority === priority.value
                      ? priority.color + ' border-current'
                      : 'bg-[#1a1a1a] border-[#262626] text-gray-400 hover:border-gray-500'
                  )}
                >
                  {priority.icon}
                  <span className="text-sm font-medium">{priority.label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('priority')} />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Forneça mais detalhes sobre o problema ou solicitação..."
              rows={4}
              {...register('description')}
              className={cn(
                'bg-[#1a1a1a] border-[#262626] focus:border-[#fc7a67] focus:ring-[#fc7a67]/20 resize-none',
                errors.description && 'border-red-500 focus:border-red-500'
              )}
            />
            {errors.description && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                {errors.description.message}
              </motion.p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#ef5907] to-[#fc7a67] hover:opacity-90 text-white gap-2"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              {isSubmitting ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
