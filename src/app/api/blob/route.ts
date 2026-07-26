// app/api/blob/route.ts
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get Better Auth session - works with cookies automatically
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Check authentication
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json(
      { error: 'Missing pathname' },
      { status: 400 }
    );
  }

  try {
    const result = await get(pathname, { access: 'private' });

    if (result?.statusCode !== 200) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Length': result.blob.size.toString(),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Blob retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}
