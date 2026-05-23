import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
  const query = request.nextUrl.search;

  return NextResponse.redirect(`${backendUrl}/api/auth/callback${query}`);
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
  const formData = await request.formData();
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      params.append(key, value);
    }
  }

  const query = params.toString();
  return NextResponse.redirect(`${backendUrl}/api/auth/callback${query ? `?${query}` : ''}`);
}
