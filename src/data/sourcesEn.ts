// sources.json'daki insan yazımı Türkçe alanların İngilizceleri (ekran için). sources.json Türkçe kalır:
// MCP ve `npm run kanit` onu kullanır. "quote" alanları kaynaktaki metnin kendisidir; çevrilmez.
import { L } from '../i18n';
import type { SourceRef } from './crops';

/** Kaynak adları (sources.json "sources" kimliğine ve Türkçe adına göre) */
const NAME_EN: Record<string, string> = {
  'FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 6': 'FAO Irrigation and Drainage Paper 56 (Allen et al., 1998), Chapter 6',
  'FAO Sulama ve Drenaj Yayını 56 (Allen ve ark., 1998), Bölüm 8': 'FAO Irrigation and Drainage Paper 56 (Allen et al., 1998), Chapter 8',
  "CNBC-e haberi: TMO 2026 hububat alım fiyatlarını açıkladı (TMO açıklamasını aktarır; TMO'nun kendi sayfası değil)":
    "CNBC-e news article: TMO announced 2026 grain purchase prices (reports TMO's announcement; not TMO's own page)",
};

/** Tablo / sayfa etiketleri */
const TABLE_EN: Record<string, string> = {
  'Tablo 11': 'Table 11',
  'Tablo 12': 'Table 12',
  "Tablo 24 (FAO 33'ten)": 'Table 24 (from FAO 33)',
  'haber metni': 'news text',
};

/** Değer notları */
const NOTE_EN: Record<string, string> = {
  'Tabloda yedi pancar satırı var; nisan ekimli, karasal iklimli satır seçildi.': 'The table has seven sugar beet rows; the April-sown, continental-climate row was chosen.',
  'Sonbahar ekimli satır seçildi; donlu kış için uzatma yapılmadı.': 'The autumn-sown row was chosen; no extension was made for a freezing winter.',
  'Kc son 0,50, tablodaki 0,60-0,35 aralığının içinde.': 'Kc end 0.50, within the 0.60-0.35 range in the table.',
  'Kc son 0,30, tablodaki 0,25-0,4 aralığının içinde.': 'Kc end 0.30, within the 0.25-0.4 range in the table.',
  'Kc orta 1,10, tablodaki 1,0-1,15 aralığının içinde.': 'Kc mid 1.10, within the 1.0-1.15 range in the table.',
  "2026 TMO alım fiyatı; haber sayfasından. TMO'nun resmi duyurusu açılmadı.": "2026 TMO purchase price, from the news page. TMO's official announcement was not opened.",
};

/** Aranıp bulunamayanlar (sources.json "notFound", aynı sırayla) */
const NOT_FOUND_EN: string[] = [
  'Stage lengths: winter wheat, winter barley and chickpea. FAO-56 Table 11 has no suitable row for a freezing continental climate (winter wheat rows: California, Mediterranean, Idaho); there is no chickpea row at all.',
  'None of the sowing dates.',
  'Ky: barley, chickpea, lentil. These crops are not in FAO-56 Table 24.',
  'None of the fully irrigated yields (TÜİK district data could not be obtained).',
  'Prices: maize, chickpea, lentil, sunflower, sugar beet (not searched or not found).',
  'TAGEM/DSİ crop water use guide: the PDF could not be reached.',
  'TÜİK district sown area and yield: not obtained because it requires a query interface.',
  'Soil: ISRIC SoilGrids returned data at only one of five points (Cihanbeyli); Karapınar and Çumra were empty, Ereğli and Altınekin timed out. District values were not applied.',
  'Groundwater allocation amount and legume subsidy: not searched.',
];

export const srcName = (tr: string) => L(tr, NAME_EN[tr] ?? tr);
export const srcTable = (tr: string) => L(tr, TABLE_EN[tr] ?? tr);
export const srcNote = (tr: string | undefined) => (tr === undefined ? undefined : L(tr, NOTE_EN[tr] ?? tr));
export const notFoundText = (tr: string, i: number) => L(tr, NOT_FOUND_EN[i] ?? tr);

/** Ürün tablosu kaynak metni (data/crops.ts "source" alanı). Kaynaklı alanlarda "ad, tablo" biçimindedir. */
const ASSUMED_EN: Record<string, string> = {
  'Proje tanımı (takım varsayımı). Yöre ekim takvimi ve FAO-56 Tablo 11 ile karşılaştırılmalı.': 'Project brief (team assumption). Should be compared with the local sowing calendar and FAO-56 Table 11.',
  'Proje tanımı (takım varsayımı). FAO-56 Tablo 12 ile karşılaştırılmalı; yerel Kc ölçümü yok.': 'Project brief (team assumption). Should be compared with FAO-56 Table 12; no local Kc measurement.',
  'Proje tanımı (takım varsayımı). FAO Sulama ve Drenaj Yayını 33 ile karşılaştırılmalı.': 'Project brief (team assumption). Should be compared with FAO Irrigation and Drainage Paper 33.',
  'Proje tanımı (takım varsayımı). TÜİK il/ilçe verimleriyle doğrulanmalı.': 'Project brief (team assumption). Should be checked against TÜİK province/district yields.',
  'Proje tanımı (takım varsayımı). TMO/borsa/Türkşeker güncel alım fiyatlarıyla doğrulanmalı.': 'Project brief (team assumption). Should be checked against current TMO / commodity exchange / Türkşeker purchase prices.',
  'Takım varsayımı (proje tanımındaki tabloda yok). Kışlık ekim kabul edildi; Konya koşullarında kırmızı mercimeğin kışlık yetişip yetişmediği, verimi ve fiyatı yerel kaynakla doğrulanmalı.':
    'Team assumption (not in the project brief table). Winter sowing assumed; whether red lentil grows as a winter crop in Konya, and its yield and price, should be checked with a local source.',
};
export function sourceText(tr: string): string {
  if (!L(false, true)) return tr;
  if (ASSUMED_EN[tr]) return ASSUMED_EN[tr];
  // kaynaklı: "<ad>, <tablo>"
  for (const name of Object.keys(NAME_EN)) {
    if (tr.startsWith(name + ', ')) return `${NAME_EN[name]}, ${srcTable(tr.slice(name.length + 2))}`;
  }
  return tr;
}

/** SourcePop'a verilecek kaynak bilgisi, seçili dilde (alıntı aynen kalır). */
export const refInLang = (r: SourceRef): SourceRef => ({ ...r, name: srcName(r.name), table: srcTable(r.table), note: srcNote(r.note) });
