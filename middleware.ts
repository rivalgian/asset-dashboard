import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Halaman/API yang tidak perlu login
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Ambil token login
  const token = request.cookies.get("auth_token")?.value;

  // Belum login
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Belum login." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Pastikan AUTH_SECRET tersedia
  if (!secret) {
    console.error("AUTH_SECRET belum tersedia.");
    
    return NextResponse.json(
      { error: "Konfigurasi autentikasi belum tersedia." },
      { status: 500 }
    );
  }

  try {
    const secretKey = new TextEncoder().encode(secret);

    await jwtVerify(token, secretKey);

    return NextResponse.next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Session tidak valid." },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }
}

export const config = {
  matcher: [
    "/",
    "/users/:path*",
    "/api/:path*"
  ]
};