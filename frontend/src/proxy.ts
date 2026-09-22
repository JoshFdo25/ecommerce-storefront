import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration for routes that require protection
const protectedRoutes = {
  profile: ['customer', 'manager', 'admin'],
  dashboard: ['manager', 'admin']
};

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Fast path: bypass if not a protected route
  const isProfileRoute = path.startsWith('/profile');
  const isDashboardRoute = path.startsWith('/dashboard');
  
  if (!isProfileRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  // Extract access token
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    // Unauthenticated: Redirect to login with callback URL
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(path));
    return NextResponse.redirect(url);
  }

  try {
    // Base64-decode the JWT payload (Edge compatible)
    // JWT format: header.payload.signature
    const payloadBase64Url = token.split('.')[1];
    
    if (!payloadBase64Url) {
      throw new Error('Invalid token format');
    }

    // Base64Url to Base64 conversion
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode base64 using atob (Edge compatible)
    const payloadString = atob(payloadBase64);
    const payload = JSON.parse(payloadString);
    
    const userRole = payload.role as string;

    // Route Authorization Logic
    if (isProfileRoute && !protectedRoutes.profile.includes(userRole)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isDashboardRoute && !protectedRoutes.dashboard.includes(userRole)) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    // Authorized
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware token parse error:', error);
    // If token is malformed, force re-login
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
