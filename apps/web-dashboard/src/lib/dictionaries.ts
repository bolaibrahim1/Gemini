export type Locale = 'ar' | 'en';

export const LOCALES: Locale[] = ['ar', 'en'];

const dictionaries = {
  ar: () => import('../messages/ar.json').then((m) => m.default),
  en: () => import('../messages/en.json').then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)['ar']>>;

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return (dictionaries[locale] ?? dictionaries.ar)();
}
