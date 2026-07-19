import type { Metadata } from 'next';
import { LOCALES, type Locale } from '@/lib/dictionaries';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Platform',
  description: 'Arabic-first conversational AI platform',
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dir = params.locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={params.locale} dir={dir}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
