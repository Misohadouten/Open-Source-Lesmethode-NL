import { NextResponse } from 'next/server';

export async function GET() {
    // Redirect to .NET backend which handles SurfConext authentication
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7207';

    return NextResponse.redirect(`${backendUrl}/api/auth/surfconext/login`);
}
