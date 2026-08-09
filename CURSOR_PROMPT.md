# SoundDrop — Continue in Cursor

You are continuing an existing project called **SoundDrop**: an urban-music streaming app
(audiomack-style: sidebar + hero + genre chips + sectioned card grids) where artists
cryptographically own their music. Every track is signed client-side with an **Ed25519**
keypair and the **server verifies the signature + content hash (CID) at ingest** before it
is ever stored. The private key never leaves the artist's browser.

## What is already built and verified
- Next.js 14 (App Router, TypeScript) app in `web/`.
- Clerk auth (`@clerk/nextjs`): `<ClerkProvider>` in `layout.tsx`, `clerkMiddleware()` in
  `proxy.ts`, `<Show>` components (NOT deprecated `<SignedIn>/<SignedOut>`), plus
  `sign-in`/`sign-up` catch-all routes.
- Ed25519 sign/verify + CID (sha256 of audio bytes) in `lib/crypto.js`; 3-gate ingest
  verification in `lib/ingest.js` (`verifyIngest`): signature valid → public key matches the
  registered artist → CID matches the real audio bytes. Any failure → `401/403`, no row
  written.
- Home feed (`app/page.tsx`) styled like audiomack for urban music with a VERIFIED badge on
  signed songs.
- Artist dashboard (`app/artist/page.tsx`): generate keypair, sign metadata, upload.
- `preview.html` at repo root: a static, fully interactive prototype (Sign In modal, genre
  filter, search) used for in-panel demos.
- Verified: `npm run lint` clean (filter `@clerk/backend` .d.ts noise with `grep -v node_modules`),
  `npm run build` → 7/7 routes, ingest harness 5/5.

## How to run
```bash
cd web
# Preview (no Clerk, headless-safe, placeholder data):
NEXT_PUBLIC_PREVIEW=1 npm run dev
# Real app (you must supply your own Clerk keys in web/.env.local):
npm run dev   # then open http://localhost:3000
```
`.env.local` is gitignored and excluded from any zip — you must create your own:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```
Add `http://localhost:3000` to the instance `allowed_origins` in Clerk or the dev-browser
handshake will block sign-in.

## Known pitfalls (already solved — don't re-break)
- `ClerkMiddlewareHandler` is NOT exported from `@clerk/nextjs/server`; type the middleware
  handler with `NextRequest, NextFetchEvent` from `next/server`.
- In preview, call `useUser()` unconditionally then discard; don't early-return before the
  hook (rules of hooks).
- Use `next/link` `<Link>`, not raw `<a>`, for internal nav (lint errors otherwise).
- `verifyIngest({meta, signature, publicKey, audioBuffer, registeredPublicKey})` — no
  `artistId` arg.
- Static `preview.html` buttons need real JS handlers or they do nothing on click.

## Suggested next steps (pick one, the user prioritized these)
1. Encrypted private-key backup UI (artist exports key wrapped with a passphrase).
2. Replace the JSON file store (`lib/db.ts`) with Postgres + S3/R2 object storage.
3. Make the real app reachable from the user's Mac (SSH tunnel or IPv6 serve).
4. Save the build as a reusable skill (already done at agent-skills/sounddrop-build).

## Done-state verification checklist for any change you make
- [ ] `npm run lint` filtered output has no real errors
- [ ] `npm run build` compiles, all routes generated
- [ ] `POST /api/tracks` rejects tampered signature / wrong key / mismatched CID with 401/403
- [ ] `POST /api/artists` returns 401 when unauthenticated
