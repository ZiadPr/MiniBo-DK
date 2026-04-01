import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", {
    path: "/",
    expires: new Date(0)
  });

  return NextResponse.json({ success: true });
}
