'use client'

import { useState } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const sectors = ['A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista']
export default function EmployeesPage() {
  const { users } = useUsers()
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<string[]>([])
  async function updateEmployee(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setSaving(true)
    try {
      const result = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, id, active: values.active === 'on' }) })
      const body = await result.json()
      if (!result.ok) throw new Error(body.error)
      toast.success('Funcionário atualizado')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao atualizar') } finally { setSaving(false) }
  }
  async function createEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setSaving(true)
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCreated(previous => [...previous, result.email])
      form.reset()
      toast.success('Funcionário cadastrado. Ele já pode entrar com o e-mail e a senha definidos.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro no cadastro') }
    finally { setSaving(false) }
  }
  return <div className="max-w-4xl mx-auto space-y-6 p-6">
    <h1 className="text-2xl font-bold">Funcionários</h1>
    <form onSubmit={createEmployee} className="grid md:grid-cols-2 gap-4 rounded-xl border p-6">
      <div><Label htmlFor="name">Nome</Label><Input id="name" name="name" required minLength={2} /></div>
      <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
      <div><Label htmlFor="password">Senha inicial (mínimo 12 caracteres)</Label><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} /></div>
      <div><Label htmlFor="role">Cargo</Label><select id="role" name="role" defaultValue="Colaborador" className="w-full rounded-md border bg-background p-2">{['Colaborador', 'Gerente', 'Admin'].map(role => <option key={role}>{role}</option>)}</select></div>
      <div><Label htmlFor="sector">Setor</Label><select id="sector" name="sector" defaultValue="Administrativo" className="w-full rounded-md border bg-background p-2">{sectors.map(sector => <option key={sector}>{sector}</option>)}</select></div>
      <Button disabled={saving} className="self-end">{saving ? 'Cadastrando…' : 'Cadastrar funcionário'}</Button>
    </form>
    <div className="rounded-xl border overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Nome', 'E-mail', 'Cargo', 'Setor'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{users?.map(user => <tr key={user.id} className="border-t"><td className="p-3">{user.name}</td><td className="p-3">{user.email}</td><td className="p-3">{user.role}</td><td className="p-3">{user.sector}</td></tr>)}</tbody></table></div>
    {created.map(email => <p key={email}>Novo acesso criado: {email}</p>)}
    {users?.map(user => <form key={user.id} onSubmit={event => updateEmployee(event, user.id)} className="border rounded-xl p-4 space-y-3"><p className="font-semibold">{user.name} · {user.email}</p><div className="flex flex-wrap gap-3"><select aria-label={`Cargo de ${user.name}`} name="role" defaultValue={user.role} className="border rounded-md bg-background p-2">{['Colaborador','Gerente','Admin'].map(role => <option key={role}>{role}</option>)}</select><select aria-label={`Setor de ${user.name}`} name="sector" defaultValue={user.sector} className="border rounded-md bg-background p-2">{sectors.map(sector => <option key={sector}>{sector}</option>)}</select><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={user.active} />Acesso ativo</label><Button disabled={saving}>Salvar acesso</Button></div></form>)}
  </div>
}
