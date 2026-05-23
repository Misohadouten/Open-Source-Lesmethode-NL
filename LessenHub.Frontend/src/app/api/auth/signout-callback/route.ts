import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
  const query = request.nextUrl.search;

  return NextResponse.redirect(`${backendUrl}/api/auth/signout-callback${query}`);
}
