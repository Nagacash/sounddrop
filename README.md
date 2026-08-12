<div align="center">

# SoundDrop

**Urban music streaming where artists cryptographically own their tracks — every upload signed client-side, every signature verified at ingest.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Ed25519](https://img.shields.io/badge/Crypto-Ed25519-6E56CF?style=flat-square)](https://ed25519.cr.yp.to/)
[![Status](https://img.shields.io/badge/Status-MVP-F59E0B?style=flat-square)]()
[![Built by Naga Codex](https://img.shields.io/badge/Built%20by-Naga%20Codex-00FF88?style=flat-square)](https://nagacodex.cloud)

</div>

---

## Overview

A streaming platform for urban music built around a single question: **can an artist prove a track is theirs, without asking a platform to vouch for them?**

SoundDrop's answer is cryptographic rather than administrative. Every track is signed in the artist's own browser with an **Ed25519** keypair. The private key never leaves the device — not on upload, not in a database, not in escrow. The server's job is not to grant ownership but to verify it, and to refuse anything it cannot.

### Three-gate ingest verification

Nothing is written until all three gates pass. Any failure returns `401`/`403` and no row is created:

1. **Signature valid** — the submitted signature verifies against the submitted metadata
2. **Key matches artist** — the signing public key belongs to the registered artist making the request
3. **Content hash matches** — the CID (SHA-256 of the audio bytes) matches the actual bytes received, so the signed metadata describes *this* file and not a substituted one

Tracks that clear all three carry a **VERIFIED** badge in the feed. Provenance becomes a property of the file, not a claim in a form.

### Key features

- **Artist-held keys** — keypair generated and stored client-side; the platform never has the ability to sign on an artist's behalf
- **Signed uploads** — metadata signed in-browser before anything is transmitted
- **Verified badge** — cryptographic provenance surfaced directly in the listening experience
- **Artist dashboard** — key generation, metadata signing and upload in one flow
- **Streaming feed** — sidebar navigation, hero, genre chips and sectioned card grids, built for browsing urban catalogues
- **Search and genre filtering** — discovery across the catalogue
- **Accounts** — Clerk authentication with a mock mode for demoing the browse and upload experience without an auth wall
- **Serverless Postgres** — Neon with Drizzle ORM, schema-first

---

## Built by / built for

An in-house **Naga Codex** product, currently at MVP.

The premise comes from a real asymmetry in music distribution: artists upload to platforms that then become the authority on who made what. Takedowns, disputed rights and impersonation all get resolved by whoever controls the database. SoundDrop inverts that — the artist holds the key, the server holds only the ability to check.

The engineering problems worth naming:

- **Key custody without key loss** — the security guarantee comes from the platform never holding the private key, which means the platform also cannot rescue an artist who loses it. That constraint shapes the whole onboarding flow
- **Verification at the edge of trust** — the CID gate exists because a valid signature over metadata proves nothing about the bytes actually uploaded. Signature and payload have to be bound together or the guarantee is decorative
- **Crypto that stays invisible** — an artist uploading a track should not have to understand Ed25519. The cryptography has to disappear into a normal upload flow, surfacing only as a badge
- **Streaming UX at MVP scale** — the listening experience has to feel like a real music platform from day one, or the provenance story has nothing to sit on

Built end to end: product concept, cryptographic architecture, ingest verification pipeline, database schema, interface design, front-end build and artist tooling.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| UI | React 19 |
| Styling | Tailwind CSS 3 |
| Animation | GSAP 3 |
| Cryptography | Ed25519 signatures + SHA-256 content addressing |
| Auth | Clerk |
| Database | Neon serverless Postgres |
| ORM | Drizzle |
| State | Zustand |

---

## Repository layout

| Path | Contents |
|---|---|
| `web/` | Next.js application |
| `lib/crypto.js` | Ed25519 sign/verify and CID generation |
| `lib/ingest.js` | Three-gate ingest verification |
| `schema.sql` | Database schema |
| `preview.html` | Static interactive prototype |

---

## Built by

**[Naga Codex](https://nagacodex.cloud)** — Maurice Holda. Product architecture, cryptographic design & full-stack development.

Interested in something similar? → [nagacodex.cloud](https://nagacodex.cloud)

---

<div align="center">

**[nagacodex.cloud](https://nagacodex.cloud) · Hamburg**

</div>
