// İki dil (Türkçe / İngilizce). Metinler yerinde iki dilli yazılır: L('Türkçe', 'English').
// Dil modül düzeyinde tutulur; React tarafında store (state.tsx) değiştirir ve bütün ağaç yeniden çizilir.
// Node'da (testler, MCP) dil Türkçe kalır; motorun Türkçe mesajları değişmez.
export type Lang = 'tr' | 'en';

let current: Lang = 'tr';

export const getLang = (): Lang => current;

export function setLang(l: Lang) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

/** İki dilli metin ya da değer: seçili dile göre birini döndürür. */
export function L<T>(tr: T, en: T): T {
  return current === 'en' ? en : tr;
}

/** Intl için yerel ayar */
export const locale = () => (current === 'en' ? 'en-US' : 'tr-TR');

/** Seçili dilde küçük harf (Türkçe I/İ kuralı dahil). */
export const lower = (s: string) => s.toLocaleLowerCase(locale());

// ---------- veri adları: depoda Türkçe durur, ekranda dile göre gösterilir ----------
const CROP_EN: Record<string, string> = {
  misir: 'Maize',
  pancar: 'Sugar beet',
  aycicegi: 'Sunflower',
  bugday: 'Winter wheat',
  arpa: 'Winter barley',
  nohut: 'Chickpea',
  mercimek: 'Red lentil',
  nadas: 'Fallow',
};

/** Ürün adı: İngilizcede kimliğe göre çevrilir; kullanıcının değiştirdiği ad yoksa varsayılan kullanılır. */
export function cropLabel(id: string, trName?: string): string {
  if (current === 'en') return CROP_EN[id] ?? trName ?? id;
  return trName ?? (id === 'nadas' ? 'Nadas' : id);
}

const METHOD_TR = { salma: 'Salma', yagmurlama: 'Yağmurlama', damla: 'Damla' } as const;
const METHOD_EN = { salma: 'Furrow', yagmurlama: 'Sprinkler', damla: 'Drip' } as const;
export const methodLabel = (k: keyof typeof METHOD_TR): string => L(METHOD_TR[k], METHOD_EN[k]);

/** "Üye 07" -> "Member 07" */
export const memberLabel = (name: string): string => (current === 'en' ? name.replace(/^Üye(?= |$)/, 'Member') : name);

const COOP_TR = 'Konya Ovası Örnek Kooperatifi';
export const coopLabel = (): string => L(COOP_TR, 'Konya Plain Sample Cooperative');

const BUYER_TR = 'Örnek Alıcı A.Ş. (kurgusal)';
/** Varsayılan kurgusal alıcı adı çevrilir; kullanıcının yazdığı ad olduğu gibi kalır. */
export const buyerLabel = (name: string): string => (current === 'en' && name === BUYER_TR ? 'Sample Buyer Inc. (fictional)' : name);

/** Kalıcı dil seçimi */
export const LANG_KEY = 'nobet-lang';
export function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'tr' || q === 'en') return q;
    const s = localStorage.getItem(LANG_KEY);
    if (s === 'tr' || s === 'en') return s;
  } catch {
    /* tarayıcı dışı ya da depolama kapalı */
  }
  return 'en';
}
