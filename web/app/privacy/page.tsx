import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy | SoundDrop',
  description: 'Privacy contact for SoundDrop.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-28 pt-10">
      <p className="font-telemetry text-xs text-sd-muted">
        <Link href="/" className="transition-colors duration-fast hover:text-sd-text">
          ← Home
        </Link>
      </p>
      <h1 className="font-display mt-6 text-3xl text-sd-text sm:text-4xl">Privacy</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-sd-muted">
        If you have questions about this Privacy Policy or how we handle personal data, contact:
      </p>
      <address className="mt-6 not-italic text-sm leading-relaxed text-sd-text">
        <p>Maurice Holda</p>
        <p>20355 Hamburg</p>
        <p>Germany</p>
        <p className="mt-4">
          Tel:{' '}
          <a
            href="tel:+4917629255188"
            className="text-sd-muted transition-colors duration-fast hover:text-sd-accent"
          >
            +49 176 29255188
          </a>
        </p>
        <p>
          <a
            href="mailto:chosenfewrecords@hotmail.de"
            className="text-sd-muted transition-colors duration-fast hover:text-sd-accent"
          >
            chosenfewrecords@hotmail.de
          </a>
        </p>
      </address>
    </main>
  );
}
