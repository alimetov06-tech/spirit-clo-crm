import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  const isDemoSession =
    (process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      (process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && process.env.NODE_ENV !== "production")) &&
    request.cookies.get("spirit_demo_session")?.value === "1";

  if (isDemoSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
