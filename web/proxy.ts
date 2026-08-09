import { clerkMiddleware } from '@clerk/nextjs/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { isMvpMockMode } from '@/lib/mockMode';

const handler = clerkMiddleware();

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (isMvpMockMode()) return;
  return handler(req, ev);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
