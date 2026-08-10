import type { Metadata } from 'next';
import './globals.css';
import HeaderBar from '@/components/HeaderBar';

export const metadata: Metadata = {
  title: 'Cafe POS - Smart POS, BOM & Channel Accounting System',
  description: 'Point of sale, BOM raw material stock deduction, channel GP settings, and CRM loyalty system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes into <body> before hydration and trigger false mismatches */}
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#f7f3eb] text-slate-800 font-sans">
        <HeaderBar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
