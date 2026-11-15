// Üye düzenleme çekmecesi: Üye ve Kooperatif ekranlarından açılır. Değişiklikler anında hesaplanır.
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { METHOD_LABEL } from '../data/defaults';
import type { IrrigationMethod } from '../engine/types';
import { cropLabel, L, memberLabel } from '../i18n';
import { da, m3, mm, pct } from '../lib/format';
import { useStore } from '../state';
import { Confirm, Select, Sheet } from './kit';
import { NumInput, Segmented, Swatch, Tag } from './ui';

export function MemberEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useStore();
  const [unit, setUnit] = useState<'mm' | 'm3'>('mm');
  const m = s.members.find((x) => x.id === id);
  const crops = s.model?.crops ?? [];
  if (!m) return null;
  const sum = m.current.reduce((x, c) => x + c.da, 0);
  const over = sum > m.areaDa + 0.05;
  const setCurrent = (i: number, patch: Partial<{ cropId: string; da: number }>) =>
    s.updateMember(m.id, { current: m.current.map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={L('Üyeyi düzenle', 'Edit member')}
      description={
        <>
          {L('Değişiklikler anında hesaplanır ve bu tarayıcıda saklanır.', 'Changes are recalculated instantly and saved in this browser.')} <Tag kind="kurgusal" />
        </>
      }
      footer={
        <>
          <Confirm
            trigger={
              <button type="button" className="btn btn-danger">
                <Trash2 /> {L('Üyeyi sil', 'Delete member')}
              </button>
            }
            title={L(`${m.name} silinsin mi?`, `Delete ${memberLabel(m.name)}?`)}
            description={L('Üye ve bugünkü ekimi kooperatiften çıkarılır. Plan, kalan üyelerle yeniden hesaplanır.', 'The member and their current planting are removed from the cooperative. The plan is recalculated with the remaining members.')}
            action={L('Sil', 'Delete')}
            danger
            onConfirm={() => {
              s.removeMember(m.id);
              onClose();
            }}
          />
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {L('Tamam', 'Done')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="block text-[12px] font-medium text-ink2">
          {L('Ad', 'Name')}
          <input className="field mt-1" value={m.name} onChange={(e) => s.updateMember(m.id, { name: e.target.value })} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-ink2">
            {L('Tarla büyüklüğü', 'Field size')}
            <NumInput className="mt-1 w-full" label={L('Tarla büyüklüğü (dekar)', 'Field size (decares)')} value={m.areaDa} min={1} max={100000} decimals={1} suffix="da" onChange={(v) => s.updateMember(m.id, { areaDa: v })} />
          </label>
          <div className="text-[12px] font-medium text-ink2">
            <div className="flex items-center justify-between">
              <span>{L('Yıllık kota', 'Annual allowance')}</span>
              <Segmented
                label={L('Kota birimi', 'Allowance unit')}
                value={unit}
                options={[
                  { id: 'mm', label: 'mm' },
                  { id: 'm3', label: 'm³' },
                ]}
                onChange={setUnit}
              />
            </div>
            {unit === 'mm' ? (
              <NumInput className="mt-1 w-full" label={L('Yıllık kota (mm)', 'Annual allowance (mm)')} value={m.quotaMm} max={5000} suffix="mm" onChange={(v) => s.updateMember(m.id, { quotaMm: v })} />
            ) : (
              <NumInput className="mt-1 w-full" label={L('Yıllık kota (metreküp)', 'Annual allowance (cubic metres)')} value={m.quotaMm * m.areaDa} max={5e8} suffix="m³" onChange={(v) => s.updateMember(m.id, { quotaMm: v / m.areaDa })} />
            )}
          </div>
        </div>
        <div className="tnum -mt-2 text-[11px] text-ink2">
          {mm(m.quotaMm)} × {da(m.areaDa)} da = {m3(m.quotaMm * m.areaDa)} · {L('1 mm su, 1 dekarda 1 m³', '1 mm of water on 1 decare is 1 m³')}
        </div>

        <div className="text-[12px] font-medium text-ink2">
          {L('Sulama yöntemi', 'Irrigation method')}
          <Select
            className="mt-1"
            label={L('Sulama yöntemi', 'Irrigation method')}
            value={m.method}
            onChange={(v) => s.updateMember(m.id, { method: v })}
            options={(Object.keys(METHOD_LABEL) as IrrigationMethod[]).map((k) => ({ value: k, label: METHOD_LABEL[k], hint: L(`randıman ${pct(s.eff[k])}`, `efficiency ${pct(s.eff[k])}`) }))}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-ink">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" checked={!!m.beetContract} onChange={(e) => s.updateMember(m.id, { beetContract: e.target.checked })} />
          <span>
            {L('Şeker pancarı sözleşmesi var', 'Has a sugar beet contract')}
            <span className="block text-[12px] text-ink2">
              {L('İşaretli değilse pancar bu üyeye önerilmez. İşaretliyse yalnız tam sulamayla önerilir.', 'If unchecked, sugar beet is not recommended to this member. If checked, it is recommended only with full irrigation.')}
            </span>
          </span>
        </label>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-ink2">{L('Bugünkü ekim', 'Current planting')}</span>
            <span className={`tnum text-[12px] ${over ? 'font-semibold text-crit-ink' : 'text-ink2'}`}>
              {da(sum)} / {da(m.areaDa)} da
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {m.current.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Swatch id={c.cropId} />
                <Select className="min-w-0 flex-1" label={L('Ürün', 'Crop')} value={c.cropId} onChange={(v) => setCurrent(i, { cropId: v })} options={crops.map((cr) => ({ value: cr.id, label: cropLabel(cr.id, cr.name) }))} />
                <NumInput className="w-[104px] shrink-0" label={L('Dekar', 'Decares')} value={c.da} max={100000} decimals={1} suffix="da" onChange={(v) => setCurrent(i, { da: v })} />
                <button type="button" className="icon-button shrink-0" aria-label={L('Bu ürünü sil', 'Remove this crop')} onClick={() => s.updateMember(m.id, { current: m.current.filter((_, k) => k !== i) })}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {m.current.length === 0 && <div className="rounded-lg bg-sunken px-3 py-2 text-[12px] text-ink2">{L('Bugünkü ekim girilmedi; tarla nadas sayılır.', 'No current planting entered; the field counts as fallow.')}</div>}
          </div>
          <button
            type="button"
            className="btn mt-2"
            onClick={() => {
              const free = crops.find((cr) => !m.current.some((c) => c.cropId === cr.id)) ?? crops[0];
              if (free) s.updateMember(m.id, { current: [...m.current, { cropId: free.id, da: Math.max(0, +(m.areaDa - sum).toFixed(1)) }] });
            }}
          >
            <Plus /> {L('Ürün ekle', 'Add crop')}
          </button>
          {over && <div className="mt-2 text-[12px] font-semibold text-crit-ink">{L('Ekim tarladan büyük: dekarları düzeltin.', 'Planting exceeds the field: correct the decares.')}</div>}
          {!over && sum < m.areaDa - 0.05 && <div className="mt-2 text-[12px] text-ink2">{L(`Kalan ${da(m.areaDa - sum)} da nadas sayılır.`, `The remaining ${da(m.areaDa - sum)} da counts as fallow.`)}</div>}
        </div>
      </div>
    </Sheet>
  );
}
