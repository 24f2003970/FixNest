import './globals.css';
import localFont from 'next/font/local';
import { Navbar } from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';

// Use the bundled font so clean builds do not require Google Fonts access.
const font = localFont({ src: './fonts/GeistVF.woff', weight: '100 900' });

export const metadata = {
  title: 'FixNest — Property Maintenance Management Platform',
  description: 'A full-stack property maintenance platform for managing properties, units, tenants, technicians, and maintenance requests.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4 focus:underline">Skip to content</a>
        <Navbar>{children}</Navbar>
        <Toaster />
      </body>
    </html>
  );
}
