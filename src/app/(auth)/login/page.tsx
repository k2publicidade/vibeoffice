/**
 * Login Page
 * Página de autenticação para o sistema
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthSwitch } from '@/components/ui/auth-switch'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    try {
      await signIn(formData.email, formData.password)
    } catch (err: any) {
      setError(err.message || 'Email ou senha inválidos')
    }
  }

  // Usuários de teste para referência
  const testUsers = [
    { email: 'eu@vibedistro.com', name: 'Você', role: 'Admin', sector: 'Administrativo' },
    { email: 'joao.silva@vibedistro.com', name: 'João Silva', role: 'Admin', sector: 'A&R' },
    { email: 'maria.santos@vibedistro.com', name: 'Maria Santos', role: 'Gerente', sector: 'Marketing' },
  ]

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="VIBEDISTRO Logo"
              width={120}
              height={60}
              priority
              className="h-auto w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">VIBEDISTRO</h1>
          <p className="text-muted-foreground">Intranet & CRM</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Acesse sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Dica: Use <code className="bg-muted px-1 rounded">password123</code>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Users Info */}
        <Card className="bg-muted/50 border-muted-foreground/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Usuários de Teste</CardTitle>
            <CardDescription>
              Para demonstração, use um destes emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {testUsers.map((user, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{user.role}</p>
                    <p>{user.sector}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
              Todos usam a senha: <code className="bg-background px-1 rounded">password123</code>
            </p>
          </CardContent>
        </Card>

        {/* Auth Switch Component */}
        <AuthSwitch className="bg-gradient-to-br from-card to-card/80" />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Este é um sistema de demonstração com dados mockados
        </p>
      </div>
    </div>
  )
}
