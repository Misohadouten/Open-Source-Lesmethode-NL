import { NextResponse } from 'next/server';

export async function POST() {
  // Redirect to backend logout endpoint
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
  
  return NextResponse.redirect(`${backendUrl}/api/auth/logout`);
}

export async function GET() {
  // Also support GET for easier logout links
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';
  
  return NextResponse.redirect(`${backendUrl}/api/auth/logout`);
}
