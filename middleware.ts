import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_SECRET_KEY } from "@/lib/auth-secret";

const SECRET = AUTH_SECRET_KEY;
const COOKIE_NAME = "checkout_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // proteger somente rotas /admin (exceto rotas públicas de auth)
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  const PUBLIC_AUTH_PATHS = [
    "/admin/login",
    "/admin/esqueci-senha",
  ];
  if (PUBLIC_AUTH_PATHS.includes(pathname)) return NextResponse.next();
  if (pathname.startsWith("/admin/redefinir-senha/")) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return redirectToLogin(req);

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
