import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName } from "@/app/lib/auth";
import { resendLatestReportForCustomer } from "@/app/lib/admin-report";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(adminCookieName);

    if (session?.value !== "authenticated") {
      return NextResponse.json(
        { message: "Niet geautoriseerd" },
        { status: 401 },
      );
    }

    const { slug } = await params;
    const result = await resendLatestReportForCustomer(slug);

    return NextResponse.json({
      success: true,
      message: "Performance mail opnieuw verstuurd",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Er ging iets mis" },
      { status: 500 },
    );
  }
}
