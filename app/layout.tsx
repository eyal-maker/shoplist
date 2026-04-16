import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'רשימת קניות',
  description: 'בניית רשימת קניות, איתור סופרים קרובים והשוואת מחירים',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
