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
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col pt-0 lg:pt-16 pb-20 lg:pb-0 font-sans tracking-tight">
        <Navbar />
        <div className="flex-1 w-full flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
