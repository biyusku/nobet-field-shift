// "Gelişigüzel dağıtım": söz, karıştırılmış sıradaki üyelere tarlanın tamamı olarak verilir.
import type { Crop, Member } from './types';

export interface ScatterResult {
  /** üye kimliği -> o üyeye verilen sözleşme ürünü */
  assigned: Map<string, string>;
  /** ürün -> tam verim varsayımıyla hesaplanan ton (seçim bu sayı sözü geçene kadar sürer) */
  nominalTons: Record<string, number>;
}

/**
 * Üyeler verilen sırayla (çağıran sabit tohumla karıştırır) gezilir. Her taahhütlü ürün için,
 * tam verim varsayılarak hesaplanan üretim sözü karşılayana dek sıradaki üyenin BÜTÜN tarlası o ürüne ayrılır.
 * Sonuç yalnız kimin ne ekeceğini söyler; gerçek verim, su hakkıyla ayrıca hesaplanır.
 */
export function scatterCommitments(order: readonly Member[], crops: readonly Crop[], commitments: Record<string, number>): ScatterResult {
  const assigned = new Map<string, string>();
  const nominalTons: Record<string, number> = {};
  let i = 0;
  for (const [cropId, tons] of Object.entries(commitments)) {
    const crop = crops.find((c) => c.id === cropId);
    if (!crop || !(tons > 0)) continue;
    nominalTons[cropId] = 0;
    while (nominalTons[cropId] < tons && i < order.length) {
      const m = order[i++];
      if (m.areaDa <= 0) continue;
      assigned.set(m.id, cropId);
      nominalTons[cropId] += (m.areaDa * crop.yieldKgDa) / 1000;
    }
  }
  return { assigned, nominalTons };
}
