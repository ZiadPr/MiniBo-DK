import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, authenticateUser, createSessionToken } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const isLocalRequest = ["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname);
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "بيانات الدخول غير صالحة" }, { status: 400 });
    }

    const session = await authenticateUser(parsed.data.username, parsed.data.password);

    if (!session) {
      return NextResponse.json({ message: "اسم المستخدم أو كلمة المرور غير صحيحين" }, { status: 401 });
    }

    const token = await createSessionToken(session);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && !isLocalRequest,
      path: "/",
      maxAge: 60 * 60 * 8
    });

    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "JWT_SECRET must be configured in production"
        ? "إعدادات المصادقة غير مكتملة على الخادم"
        : "تعذر إتمام تسجيل الدخول";

    return NextResponse.json({ message }, { status: 500 });
  }
}
