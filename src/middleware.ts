/**
 * Next.js Middleware - Proteção de rotas com Supabase Auth
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // [M14] Trocado getSession() (deprecated) por getUser() — valida JWT no servidor
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/update-password')

  const isProtectedRoute = !isPublicRoute

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Rotas restritas a Admin (Configurações de Cursos)
  const isAdminOnlyRoute =
    request.nextUrl.pathname.startsWith('/courses/manage')

  if (isAdminOnlyRoute && user) {
    // TODO: rodada futura — popular app_metadata.role via trigger no signup ou função RPC
    // pra eliminar o fallback de DB query. Ver achado S-P0-02 do diagnostico.
    // Preferir role do JWT custom claim (sem query no banco)
    let role: string | undefined =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined)

    // Fallback: se app_metadata ainda não estiver populado (migration de role no JWT pendente)
    if (!role) {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      role = data?.role ?? undefined
    }

    if (role !== 'Admin') {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('access', 'denied')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
