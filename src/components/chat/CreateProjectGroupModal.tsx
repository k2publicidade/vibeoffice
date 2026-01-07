'use client'

import { useState } from 'react'
import { X, ArrowLeft, ArrowRight } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { CreateProjectGroupData } from '@/types/chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CreateProjectGroupModalProps {
  open: boolean
  onClose: () => void
  onCreateGroup: (data: CreateProjectGroupData) => Promise<void>
}

export function CreateProjectGroupModal({
  open,
  onClose,
  onCreateGroup
}: CreateProjectGroupModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { users } = useUsers()
  const { user } = useAuth()

  // Filtrar usuários disponíveis (excluindo usuário atual)
  const availableUsers = (users || []).filter(u =>
    u.id !== user?.id && // Excluir usuário atual
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.sector.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Agrupar usuários por setor para melhor organização
  const usersBySector = availableUsers.reduce((acc, user) => {
    const sector = user.sector || 'Sem Setor'
    if (!acc[sector]) acc[sector] = []
    acc[sector].push(user)
    return acc
  }, {} as Record<string, typeof availableUsers>)

  // Reset modal ao fechar
  const handleClose = () => {
    setGroupName('')
    setDescription('')
    setSelectedMembers([])
    setSearchQuery('')
    setStep(1)
    onClose()
  }

  // Criar grupo
  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await onCreateGroup({
        name: groupName,
        description: description,
        memberIds: selectedMembers
      })
      handleClose()
    } catch (error) {
      console.error('Error in modal:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Toggle seleção de membro
  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Verificar se pode avançar do passo 1
  const canProceedToStep2 = groupName.trim().length > 0 &&
                            groupName.length <= 50 &&
                            description.trim().length > 0 &&
                            description.length <= 200

  // Verificar se pode criar
  const canCreate = canProceedToStep2 && selectedMembers.length >= 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Grupo de Projeto</DialogTitle>
          <DialogDescription>
            Passo {step} de 2: {step === 1 ? 'Informações do Grupo' : 'Selecionar Membros'}
          </DialogDescription>
        </DialogHeader>

        {/* PASSO 1: Nome e Descrição */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="group-name">
                Nome do Grupo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder="Ex: Lançamento Artista X"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {groupName.length}/50 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="description">
                Descrição/Objetivo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o propósito deste grupo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={200}
                className="mt-2 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/200 caracteres
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 2: Selecionar Membros */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* Busca de usuários */}
            <div>
              <Input
                placeholder="Buscar por nome, email ou setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Membros selecionados */}
            {selectedMembers.length > 0 && (
              <div className="pb-2 border-b">
                <Label className="text-sm text-gray-600">
                  Selecionados ({selectedMembers.length})
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMembers.map(userId => {
                    const selectedUser = (users || []).find(u => u.id === userId)
                    return (
                      <Badge key={userId} variant="secondary" className="pl-2 pr-1">
                        {selectedUser?.name}
                        <button
                          onClick={() => toggleMember(userId)}
                          className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lista de usuários por setor */}
            <ScrollArea className="h-[300px] pr-4">
              {Object.keys(usersBySector).length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                Object.entries(usersBySector).map(([sector, sectorUsers]) => (
                  <div key={sector} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-white py-1">
                      {sector}
                    </h4>
                    <div className="space-y-1">
                      {sectorUsers.map(user => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(user.id)}
                            onCheckedChange={() => toggleMember(user.id)}
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>

            {/* Ações */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating}
                >
                  {isCreating ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
