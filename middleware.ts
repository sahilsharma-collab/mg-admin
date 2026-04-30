// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  // If the user is not authenticated and tries to access a protected route, redirect to /login
  if (!token && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If the user is authenticated and tries to access /login, redirect to the home page
  if (token && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Specify the routes to apply the middleware to
export const config = {
  // matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|Images|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg+$|.*\\.gif$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
