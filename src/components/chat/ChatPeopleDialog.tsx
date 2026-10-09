'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChatRoom } from '@/types/chat'
import type { User } from '@/hooks/useUsers'
import { toast } from 'sonner'

interface Props {
  room: ChatRoom
  users: User[]
  currentUserId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateGroup?: (roomId: string, updates: { name?: string; description?: string }) => Promise<boolean>
  onAddMember?: (roomId: string, userId: string) => Promise<boolean>
  onRemoveMember?: (roomId: string, userId: string) => Promise<boolean>
}

export function ChatPeopleDialog({ room, users, currentUserId, open, onOpenChange, onUpdateGroup, onAddMember, onRemoveMember }: Props) {
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description || '')
  const [memberId, setMemberId] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setName(room.name); setDescription(room.description || ''); setMemberId('') }, [room.id, room.name, room.description])
  const canManage = room.type === 'project' && room.createdBy === currentUserId
  const people = users.filter(person => person.active && (room.participants.includes(person.id) || (room.type === 'sector' && person.sector === room.sector)) && (room.type !== 'dm' || person.id !== currentUserId))
  const available = users.filter(person => person.active && !room.participants.includes(person.id))
  async function execute(operation: () => Promise<boolean | undefined>) {
    setBusy(true)
    try { const success = await operation(); if (success) setMemberId('') }
    catch { toast.error('Não foi possível atualizar o grupo') }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{room.type === 'dm' ? 'Perfil' : 'Participantes'}</DialogTitle></DialogHeader>
    {canManage && onUpdateGroup && <form className="space-y-3 border-b pb-4" onSubmit={event => { event.preventDefault(); void execute(() => onUpdateGroup(room.id, { name: name.trim(), description: description.trim() })) }}><Label htmlFor="group-name">Nome do grupo</Label><Input id="group-name" value={name} maxLength={50} onChange={event => setName(event.target.value)} required /><Label htmlFor="group-description">Descrição</Label><Input id="group-description" value={description} maxLength={200} onChange={event => setDescription(event.target.value)} /><Button disabled={busy || !name.trim()} type="submit">Salvar grupo</Button></form>}
    <div className="space-y-4">{people.map(person => <div key={person.id} className="flex items-center justify-between gap-3"><div><p className="font-medium">{person.name}</p><p className="text-sm text-muted-foreground break-all">{person.email} · {person.role} · {person.sector}</p></div>{canManage && onRemoveMember && person.id !== room.createdBy && <Button disabled={busy} variant="outline" onClick={() => void execute(() => onRemoveMember(room.id, person.id))}>Remover</Button>}</div>)}</div>
    {canManage && onAddMember && available.length > 0 && <div className="space-y-3 border-t pt-4"><Label htmlFor="group-new-member">Adicionar participante</Label><select id="group-new-member" value={memberId} onChange={event => setMemberId(event.target.value)} className="w-full border rounded p-2 bg-background"><option value="">Selecione um funcionário</option>{available.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><Button disabled={busy || !memberId} onClick={() => void execute(() => onAddMember(room.id, memberId))}>Adicionar</Button></div>}
  </DialogContent></Dialog>
}
