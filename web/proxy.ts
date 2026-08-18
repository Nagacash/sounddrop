import { clerkMiddleware } from '@clerk/nextjs/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isMvpMockMode } from '@/lib/mockMode';
import { updateSession } from '@/utils/supabase/middleware';

const clerkHandler = clerkMiddleware();

function isMediaUpload(req: NextRequest) {
  if (req.method !== 'POST') return false;
  const path = req.nextUrl.pathname;
  return (
    path === '/api/tracks' ||
    path === '/api/artists/avatar' ||
    path.endsWith('/cover')
  );
}

export default async function proxy(req: NextRequest, ev: NextFetchEvent) {
  // Large multipart bodies must not be cloned by proxy (10MB default truncate).
  if (isMediaUpload(req)) {
    return NextResponse.next();
  }

  // Keep Supabase auth cookies fresh on every matched request.
  const supabaseResponse = await updateSession(req);

  if (isMvpMockMode()) {
    return supabaseResponse;
  }

  const clerkResult = await clerkHandler(req, ev);
  if (!clerkResult) {
    return supabaseResponse;
  }

  // Merge refreshed Supabase cookies onto the Clerk response when possible.
  if (clerkResult instanceof NextResponse) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      clerkResult.cookies.set(cookie);
    });
  }
  return clerkResult;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
