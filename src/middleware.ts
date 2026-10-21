import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/dashboard', '/promote', '/earn', '/wallet', '/admin']
const AUTH_PATHS = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request)
  const path = request.nextUrl.pathname

  // If Supabase is not configured, still serve public pages (don't 500 the whole site)
  if (!supabase) {
    return supabaseResponse
  }

  const isProtected = PROTECTED_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  )
  const isAuthPage = AUTH_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, terms_accepted_at')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
