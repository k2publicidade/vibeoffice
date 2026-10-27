'use client'

import { requestTypes, type NewRequestInput } from '@/lib/request-types'
import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  PremiumModal,
  PremiumModalHeader,
  PremiumModalTitle,
  PremiumModalDescription,
  PremiumModalBody,
  PremiumModalFooter,
} from '@/components/ui/premium-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PremiumDatePicker } from '@/components/ui/premium-date-picker'

interface NewRequestModalProps {
  open: boolean
  onClose: () => void
  onSave: (request: NewRequestInput) => Promise<void> | void
}



// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function NewRequestModal({
  open,
  onClose,
  onSave,
}: NewRequestModalProps) {
  const [sector, setSector] = useState('Administrativo')
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [description, setDescription] = useState('')

  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!type || !startDate || !endDate || description.trim().length < 10) return
    if (endDate < startDate) { toast.error('A data final deve ser igual ou posterior à inicial'); return }

    setSaving(true)
    try {
      await onSave({
        type,
        sector: requestTypes.find(item => item.id === type)!.sector,
        startDate,
        endDate,
        description: description.trim(),
      })
      handleReset()
      onClose()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar') } finally { setSaving(false) }
  }

  const handleReset = () => {
    setType('')
    setStartDate(undefined)
    setEndDate(undefined)
    setDescription('')
  }

  const selectedType = requestTypes.find((t) => t.id === type)

  return (
    <PremiumModal open={open} onClose={onClose} size="md">
      <PremiumModalHeader>
        <PremiumModalTitle>
          {selectedType ? `${selectedType.icon} ${selectedType.name}` : 'Nova Solicitação'}
        </PremiumModalTitle>
        <PremiumModalDescription>
          Preencha os detalhes da sua solicitação
        </PremiumModalDescription>
      </PremiumModalHeader>

      <PremiumModalBody>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          <motion.div variants={itemVariants}>
            <Label>Setor de destino</Label>
            <Select value={sector} onValueChange={(value) => { setSector(value); setType('') }}>
              <SelectTrigger aria-label="Setor de destino"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from(new Set(requestTypes.map(item => item.sector))).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">A solicitação será enviada para {sector}, que poderá aceitar ou recusar o atendimento.</p>
          </motion.div>
          {/* Request Type */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="request-type" className="text-sm font-medium">
              Tipo de solicitação
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-all">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.filter(item => item.sector === sector).map((requestType) => (
                  <SelectItem key={requestType.id} value={requestType.id}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{requestType.icon}</span>
                      <span>{requestType.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Date Range */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <PremiumDatePicker
              label="Data início"
              date={startDate}
              onDateChange={setStartDate}
            />
            <PremiumDatePicker
              label="Data fim"
              date={endDate}
              onDateChange={setEndDate}
            />
          </motion.div>

          {/* Summary */}
          {startDate && endDate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
            >
              <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período solicitado</p>
                <p className="font-medium text-zinc-100">
                  {startDate && format(startDate, "d 'de' MMMM", { locale: ptBR })} até{' '}
                  {endDate && format(endDate, "d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </motion.div>
          )}

          {/* Description */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              Motivo da solicitação (obrigatório)
            </Label>
            <Textarea
              id="description"
              placeholder="Explique o motivo da solicitação (mínimo de 10 caracteres)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[100px] rounded-xl border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 focus:border-orange-500 focus:ring-orange-500/20 transition-all resize-none"
            />
          </motion.div>
        </motion.div>
      </PremiumModalBody>

      <PremiumModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full px-6 h-11 border-zinc-700 hover:bg-zinc-800 hover:text-foreground"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !type || !startDate || !endDate || description.trim().length < 10}
          className="rounded-full px-6 h-11 bg-gradient-to-br from-[#fe6e5b] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] shadow-lg shadow-[#ff0300]/30 transition-all disabled:opacity-50"
        >
          Enviar solicitação
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
