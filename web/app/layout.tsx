import { Archivo_Black, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { isMvpMockMode } from '@/lib/mockMode';
import AppHeader from '@/components/AppHeader';
import GlobalPlayer from '@/components/GlobalPlayer';
import './globals.css';

const display = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'SoundDrop',
  description: 'Artist-owned audio drops — signed, not custodied',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mock = isMvpMockMode();
  const shell = `${display.variable} ${mono.variable} min-h-screen bg-sd-bg font-mono text-sd-text`;

  if (mock) {
    return (
      <html lang="en">
        <body className={shell}>
          <AppHeader mock />
          {children}
          <GlobalPlayer />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={shell}>
        <ClerkProvider>
          <AppHeader mock={false} />
          {children}
          <GlobalPlayer />
        </ClerkProvider>
      </body>
    </html>
  );
}
