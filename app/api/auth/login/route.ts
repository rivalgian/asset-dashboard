import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT id, username, email, password_hash, role
      FROM users
      WHERE username = $1 OR email = $1
      LIMIT 1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Username/email atau password salah." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: "Username/email atau password salah." },
        { status: 401 }
      );
    }

    await createSession({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal melakukan login." },
      { status: 500 }
    );
  }
}