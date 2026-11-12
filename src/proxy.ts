/**
 * Next.js Proxy (antigo Middleware) - Proteção de rotas com Supabase Auth
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeAuthRedirect } from '@/lib/auth-redirect'

export async function proxy(request: NextRequest) {
  // Server-to-server webhook authenticates with its own secret in the route.
  if (request.nextUrl.pathname === '/api/notifications/deliver' || request.nextUrl.pathname === '/api/drive/cleanup' || /^\/api\/drive\/files\/[^/]+\/content$/.test(request.nextUrl.pathname) || request.nextUrl.pathname === '/office-sw.js' || request.nextUrl.pathname.startsWith('/drive/share/')) return NextResponse.next()
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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // [M14] Trocado getSession() (deprecated) por getUser() — valida JWT no servidor
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname === '/login'
  const isPublicRoute =
    isAuthRoute ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname === '/update-password'

  function redirect(url: URL) {
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  const isProtectedRoute = !isPublicRoute
  const destination = isAuthRoute
    ? safeAuthRedirect(request.nextUrl.searchParams.get('next'))
    : safeAuthRedirect(request.nextUrl.pathname + request.nextUrl.search)

  function requireAuthentication(path: '/login' | '/auth/mfa') {
    const url = new URL(path, request.url)
    if (destination !== '/') url.searchParams.set('next', destination)
    return redirect(url)
  }

  if (isProtectedRoute && !user) {
    return requireAuthentication('/login')
  }

  const checksMfa = !!user && request.nextUrl.pathname !== '/auth/mfa' && !request.nextUrl.pathname.startsWith('/auth/callback')
  const needsProfile = isProtectedRoute && !!user
  // MFA e perfil são independentes: buscamos em paralelo (antes eram round-trips em série)
  const [assuranceResult, profileResult] = await Promise.all([
    checksMfa ? supabase.auth.mfa.getAuthenticatorAssuranceLevel() : Promise.resolve(null),
    needsProfile ? supabase.from('users').select('role, active').eq('id', user!.id).single() : Promise.resolve(null),
  ])

  if (checksMfa) {
    const assurance = assuranceResult?.data
    if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
      return requireAuthentication('/auth/mfa')
    }
  }

  if (isAuthRoute && user) {
    return redirect(new URL(destination, request.url))
  }

  const profile = profileResult?.data as { role?: string; active?: boolean } | null | undefined
  if (needsProfile) {
    if (!profile || !profile.active) {
      await supabase.auth.signOut()
      return redirect(new URL('/login', request.url))
    }
  }

  // Rotas restritas a Admin (Configurações de Cursos)
  const isAdminOnlyRoute =
    request.nextUrl.pathname.startsWith('/courses/manage') ||
    request.nextUrl.pathname.startsWith('/admin/')

  if (isAdminOnlyRoute && user) {
    // A autorização vem do banco (perfil já carregado acima). user_metadata é editável pelo próprio usuário.
    if (profile?.role !== 'Admin') {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('access', 'denied')
      return redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
