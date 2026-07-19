/** Lightweight language detection for routing and retrieval filters (§6.6). */
export function detectLanguage(text: string): 'ar' | 'en' | 'mixed' {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const total = arabic + latin;
  if (total === 0) return 'en';
  const arabicRatio = arabic / total;
  if (arabicRatio > 0.8) return 'ar';
  if (arabicRatio < 0.2) return 'en';
  return 'mixed';
}
