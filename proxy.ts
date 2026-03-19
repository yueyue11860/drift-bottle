import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/bottles', '/throw']

export function proxy(request: NextRequest) {
  const token = request.cookies.get('sm_token')?.value
  const { pathname } = request.nextUrl

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from login page
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/bottles/:path*', '/throw/:path*', '/login'],
}
