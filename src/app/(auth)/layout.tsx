/**
 * Auth Layout
 * Layout para rotas de autenticação (sem sidebar)
 */

import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-background">
      {children}
    </div>
  )
}
