import Link from 'next/link';
import { getDictionary, type Locale } from '@/lib/dictionaries';

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const dict = await getDictionary(params.locale);
  const otherLocale = params.locale === 'ar' ? 'en' : 'ar';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">{dict.appName}</h1>
      <p className="max-w-xl text-center text-lg text-slate-600">{dict.tagline}</p>
      <div className="flex gap-4">
        <span className="rounded-lg bg-slate-900 px-6 py-3 text-white">{dict.login}</span>
        <span className="rounded-lg border border-slate-300 px-6 py-3">{dict.register}</span>
      </div>
      <Link href={`/${otherLocale}`} className="text-sm text-slate-500 underline">
        {otherLocale === 'ar' ? 'العربية' : 'English'}
      </Link>
    </main>
  );
}
