// Bileşen kiti: Radix tabanlı seçici, yan çekmece, onay penceresi ve ipucu. Stil, panelin kart diline uyar.
import { Check, ChevronDown, X } from 'lucide-react';
import { AlertDialog, Dialog, Popover, Select as RSelect, Tooltip } from 'radix-ui';
import type { ReactNode } from 'react';

export const TooltipProvider = Tooltip.Provider;

/** Üzerine gelince ya da odaklanınca açıklama gösterir. */
export function Tip({ text, children }: { text: ReactNode; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} className="z-[1100] max-w-[280px] rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-lg">
          {text}
          <Tooltip.Arrow className="fill-[#1a1a1a]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** "kaynak" etiketi: tıklayınca kaynağın adı, tablosu, değerin geçtiği ifade ve bağlantısı görünür. */
export function SourcePop({ name, url, table, quote, accessed, note }: { name: string; url: string; table: string; quote: string; accessed: string; note?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="tag tag-success cursor-pointer border-0" aria-label={`Kaynak: ${name}`}>
        kaynak
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} collisionPadding={12} className="z-[1100] w-[320px] max-w-[calc(100vw-24px)] rounded-[10px] bg-surface p-3 text-[12.5px] leading-snug text-ink shadow-[0_8px_28px_rgba(0,0,0,.16),0_0_0_1px_var(--line)]">
          <div className="font-semibold">{name}</div>
          <div className="mt-0.5 text-ink2">{table}</div>
          <div className="mt-2 rounded-md bg-sunken px-2 py-1.5 font-mono text-[11.5px]">{quote}</div>
          {note && <div className="mt-2 text-ink2">{note}</div>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="font-medium text-link underline underline-offset-2">
              Kaynağı aç
            </a>
            <span className="text-[11px] text-ink2">erişim: {accessed.split('-').reverse().join('.')}</span>
          </div>
          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Seçici. variant: 'field' form alanı, 'pill' başlıktaki hap, 'dark' kenar menü.
 * prefix: tetikleyicide değerden önce gösterilen soluk etiket.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  variant = 'field',
  prefix,
  className = '',
  icon,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  label: string;
  variant?: 'field' | 'pill' | 'dark';
  prefix?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const trigger =
    variant === 'pill'
      ? 'pill cursor-pointer border-0'
      : variant === 'dark'
        ? 'flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[13px] font-medium text-white outline-none hover:border-white/15 focus-visible:ring-2 focus-visible:ring-white/30'
        : 'field flex cursor-pointer items-center justify-between gap-2 text-left';
  return (
    <RSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RSelect.Trigger aria-label={label} className={`${trigger} ${className}`}>
        {icon}
        {prefix && <span className="font-normal text-ink2">{prefix}</span>}
        <span className="min-w-0 flex-1 truncate text-left">
          <RSelect.Value />
        </span>
        <RSelect.Icon>
          <ChevronDown size={14} className={variant === 'dark' ? 'text-white/45' : 'text-ink2'} />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content position="popper" sideOffset={4} className="z-[1100] max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] bg-surface p-1 text-[13px] text-ink shadow-[0_8px_28px_rgba(0,0,0,.16),0_0_0_1px_var(--line)]">
          <RSelect.Viewport>
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 outline-none data-[highlighted]:bg-sunken data-[state=checked]:font-semibold"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                {o.hint && <span className="text-[11px] font-normal text-ink2">{o.hint}</span>}
                <RSelect.ItemIndicator className="absolute right-2">
                  <Check size={14} />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/** Sağdan açılan çekmece: düzenleme formları için. */
export function Sheet({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[900] bg-black/40" />
        <Dialog.Content className="sheet-content fixed inset-y-0 right-0 z-[901] flex w-full max-w-[460px] flex-col bg-surface shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="m-0 text-[15px] font-[650] text-ink">{title}</Dialog.Title>
              {description && <Dialog.Description className="m-0 mt-0.5 text-[12px] text-ink2">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="icon-button !text-ink2" aria-label="Kapat">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Geri alınamayan işlemler için onay penceresi (tarayıcının confirm kutusu yerine). */
export function Confirm({ trigger, title, description, action, danger = false, onConfirm }: { trigger: ReactNode; title: string; description: ReactNode; action: string; danger?: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="sheet-overlay fixed inset-0 z-[1000] bg-black/40" />
        <AlertDialog.Content className="dialog-content fixed left-1/2 top-1/2 z-[1001] w-[calc(100vw-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-5 shadow-2xl outline-none">
          <AlertDialog.Title className="m-0 text-[15px] font-[650] text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mb-0 mt-1.5 text-[13px] text-ink2">{description}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel className="btn">Vazgeç</AlertDialog.Cancel>
            <AlertDialog.Action className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
              {action}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
