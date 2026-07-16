import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  const DEMO_EMAIL = "j.candelaria171@gmail.com";
  const DEMO_PASSWORD = "TempPassword123!";

  const emailMatch = email?.toLowerCase() === DEMO_EMAIL.toLowerCase();
  const passwordMatch = password === DEMO_PASSWORD;

  return NextResponse.json({
    success: emailMatch && passwordMatch,
    debug: {
      email: { provided: email, expected: DEMO_EMAIL, match: emailMatch },
      password: { provided: password, expected: DEMO_PASSWORD, match: passwordMatch },
      passwordLength: password?.length || 0,
    },
  });
}
