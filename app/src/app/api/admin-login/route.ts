import { NextResponse } from "next/server";
import { getAdminCredentials, adminCookieName } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const admin = getAdminCredentials();

    if (username !== admin.username || password !== admin.password) {
      return NextResponse.json(
        { success: false, message: "Ongeldige login" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(adminCookieName, "authenticated", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Er ging iets mis" },
      { status: 500 },
    );
  }
}
