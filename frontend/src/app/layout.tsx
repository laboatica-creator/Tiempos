import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tiempos - Premium Betting',
  description: 'Fast, secure, and real-time Tiempos betting platform.',
};

import Navbar from '@/components/Navbar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased min-h-screen flex flex-col pt-0 lg:pt-20 pb-24 lg:pb-0 font-sans tracking-tight bg-[#0f172a] text-gray-200">
        <Navbar />
        <main className="flex-1 w-full flex flex-col p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
