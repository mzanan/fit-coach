import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth", "/api/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (!sessionCookie && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
