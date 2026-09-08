"use client";

import { cn } from "@/lib/utils";

/**
 * Hafif sekme şeridi.
 *
 * Radix Tabs eklemek yerine mevcut "ödemeler" sayfasındaki ay sekmesi görsel
 * diliyle aynı olan buton tabanlı bir bileşen kullanıldı: yeni bağımlılık
 * gerektirmez, sekme içeriği server component olarak kalabilir ve mobilde
 * yatay kaydırılabilir.
 */
export type SegmentedTabItem<T extends string> = {
  value: T;
  label: string;
  /** Sekme etiketinin yanında gösterilen sayaç (0 ise gizlenir). */
  count?: number;
};

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = "md",
  ariaLabel,
}: {
  items: SegmentedTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-lg font-medium transition-colors border inline-flex items-center gap-2",
              size === "sm"
                ? "px-3 py-1.5 text-sm min-h-[38px]"
                : "px-4 py-2 text-base min-h-[44px]",
              isActive
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {item.label}
            {typeof item.count === "number" && item.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
