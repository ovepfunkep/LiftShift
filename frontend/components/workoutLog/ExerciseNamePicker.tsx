import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseAsset } from '../../utils/data/exerciseAssets';
import { assetPath } from '../../constants';

const LIST_LIMIT = 30;

function thumbUrl(asset: ExerciseAsset | undefined): string | null {
  const t = asset?.thumbnail?.trim();
  if (!t) return null;
  if (t.startsWith('http') || t.startsWith('data:')) return t;
  return assetPath(t.startsWith('/') ? t : `/${t}`);
}

interface ExerciseNamePickerProps {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  assets: Map<string, ExerciseAsset>;
  placeholder?: string;
  disabled?: boolean;
}

export const ExerciseNamePicker: React.FC<ExerciseNamePickerProps> = ({
  id,
  value,
  onChange,
  assets,
  placeholder,
  disabled,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [muscle, setMuscle] = useState<string>('');
  const [debounced, setDebounced] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const idTimer = window.setTimeout(() => setDebounced(query.trim()), 150);
    return () => window.clearTimeout(idTimer);
  }, [query]);

  const muscles = useMemo(() => {
    const s = new Set<string>();
    for (const a of assets.values()) {
      const m = a.primary_muscle?.trim();
      if (m) s.add(m);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    const rows: { name: string; asset: ExerciseAsset | undefined }[] = [];
    for (const [name, asset] of assets.entries()) {
      if (muscle && asset.primary_muscle?.trim() !== muscle) continue;
      if (q && !name.toLowerCase().includes(q)) continue;
      rows.push({ name, asset });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [assets, debounced, muscle]);

  const [showCount, setShowCount] = useState(LIST_LIMIT);
  useEffect(() => {
    setShowCount(LIST_LIMIT);
  }, [debounced, muscle]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const visible = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  return (
    <div ref={wrapRef} className="relative space-y-1">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          className="text-xs rounded border border-slate-600/60 bg-black/50 px-2 py-1 text-slate-200 max-w-[10rem]"
          disabled={disabled}
          aria-label={t('log.muscleFilter')}
        >
          <option value="">{t('log.muscleAll')}</option>
          {muscles.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-md border border-slate-600/70 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id ?? 'ex'}-listbox`}
      />
      {open && !disabled && (
        <ul
          id={`${id ?? 'ex'}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-600/80 bg-slate-950 shadow-lg"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">{t('log.noMatches')}</li>
          ) : (
            visible.map(({ name, asset }) => (
              <li key={name} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(name);
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {asset ? (
                    <span className="h-9 w-9 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                      {thumbUrl(asset) ? (
                        <img
                          src={thumbUrl(asset)!}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                          —
                        </span>
                      )}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                </button>
              </li>
            ))
          )}
          {hasMore ? (
            <li className="border-t border-slate-800 p-1">
              <button
                type="button"
                className="w-full rounded py-1 text-xs text-emerald-400/90 hover:bg-white/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCount((c) => c + LIST_LIMIT)}
              >
                {t('log.showMore')}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
};
