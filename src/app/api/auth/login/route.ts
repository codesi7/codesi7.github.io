import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { readDatasetRecords } from "@/lib/data-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { records } = await readDatasetRecords("login", "local");
    const matched = records.find(
      (u) =>
        String(u.email || "").trim().toLowerCase() === email &&
        String(u.password || "").trim() === password
    );

    if (!matched) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email and password." },
        { status: 401 }
      );
    }

    const status = String(matched.status || "").trim().toLowerCase();
    if (status && status !== "active") {
      return NextResponse.json(
        { error: "This account is currently inactive. Contact an administrator." },
        { status: 403 }
      );
    }

    const user = {
      _id: matched._id,
      name: String(matched.name || "Admin"),
      email: String(matched.email || email),
      role: String(matched.role || "admin"),
      status: String(matched.status || "active"),
    };

    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authentication failed." },
      { status: 500 }
    );
  }
}
