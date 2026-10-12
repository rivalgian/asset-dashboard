import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          reason: "Session tidak ditemukan atau tidak valid."
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user
    });
  } catch (error) {
    console.error("ME ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
        reason: "Terjadi error saat membaca session."
      },
      { status: 500 }
    );
  }
}