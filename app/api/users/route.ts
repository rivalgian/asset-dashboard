import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Belum login." },
        { status: 401 }
      )
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Akses hanya untuk admin." },
        { status: 403 }
      )
    };
  }

  return { user };
}

// GET - daftar user
export async function GET() {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const result = await pool.query(`
      SELECT
        id,
        username,
        email,
        role,
        created_at
      FROM users
      ORDER BY created_at ASC
    `);

    return NextResponse.json({
      data: result.rows
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal mengambil data user." },
      { status: 500 }
    );
  }
}

// POST - tambah user
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const username = String(body.username ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "user";

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        `
        INSERT INTO users
          (username, email, password_hash, role)
        VALUES
          ($1, $2, $3, $4)
        RETURNING id, username, email, role, created_at
        `,
        [username, email, passwordHash, role]
      );

      return NextResponse.json(
        {
          success: true,
          user: result.rows[0]
        },
        { status: 201 }
      );
    } catch (error: any) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Username atau email tersebut sudah digunakan."
          },
          { status: 409 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal membuat user." },
      { status: 500 }
    );
  }
}

// PUT - ubah role
export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const id = String(body.id);
    const role = body.role === "admin" ? "admin" : "user";

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { error: "ID user tidak valid." },
        { status: 400 }
      );
    }

    // Jangan biarkan admin terakhir kehilangan role admin
    if (role === "user") {
      const currentUser = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [id]
      );

      if (currentUser.rows.length === 0) {
        return NextResponse.json(
          { error: "User tidak ditemukan." },
          { status: 404 }
        );
      }

      if (currentUser.rows[0].role === "admin") {
        const adminCount = await pool.query(`
          SELECT COUNT(*)::int AS count
          FROM users
          WHERE role = 'admin'
        `);

        if (adminCount.rows[0].count <= 1) {
          return NextResponse.json(
            {
              error:
                "Tidak dapat mengubah admin terakhir menjadi user."
            },
            { status: 400 }
          );
        }
      }
    }

    const result = await pool.query(
      `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, username, email, role, created_at
      `,
      [role, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal mengubah role user." },
      { status: 500 }
    );
  }
}

// DELETE - hapus user
export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id"));

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        { error: "ID user tidak valid." },
        { status: 400 }
      );
    }

    // Admin tidak boleh menghapus dirinya sendiri
    if (id === auth.user.id) {
      return NextResponse.json(
        {
          error:
            "Anda tidak dapat menghapus akun yang sedang digunakan."
        },
        { status: 400 }
      );
    }

    // Jangan hapus admin terakhir
    const target = await pool.query(
      `SELECT role FROM users WHERE id = $1`,
      [id]
    );

    if (target.rows.length === 0) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    if (target.rows[0].role === "admin") {
      const adminCount = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE role = 'admin'
      `);

      if (adminCount.rows[0].count <= 1) {
        return NextResponse.json(
          {
            error:
              "Admin terakhir tidak dapat dihapus."
          },
          { status: 400 }
        );
      }
    }

    await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal menghapus user." },
      { status: 500 }
    );
  }
}