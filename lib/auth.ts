import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET belum diset di .env.local");
}

const secretKey = new TextEncoder().encode(secret);

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
};

export async function createSession(user: AuthUser) {
  const token = await new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  })
    .setProtectedHeader({
      alg: "HS256"
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieStore = await cookies();

  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
}   

export async function getSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.id !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "admin" && payload.role !== "user")
    ) {
      return null;
    }

    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });
}