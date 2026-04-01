import './globals.css';
import type { Metadata } from 'next';
import AnnouncementBanner from '@/components/AnnouncementBanner';

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
        
        {/* Banner de Anuncios - aparece en la parte inferior */}
        <AnnouncementBanner />
        
        {/* Footer Global with WhatsApp */}
        <footer className="w-full bg-[#1e293b] border-t border-white/5 py-8 mt-auto hidden lg:flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">© 2026 Tiempos Pro. Todos los derechos reservados.</p>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '50688888888'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-[#1ebe57] transition-all shadow-[0_0_15px_rgba(37,211,102,0.2)]"
          >
            <span className="text-base">📲</span> SOPORTE TÉCNICO
          </a>
        </footer>
        
        {/* Mobile floating whatsapp button */}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '50688888888'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:hidden fixed bottom-[90px] right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform"
        >
          <span className="text-2xl">📲</span>
        </a>
      </body>
    </html>
  );
}