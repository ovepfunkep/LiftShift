import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** UI language (EN/RU), persisted by i18next in localStorage `liftshift_locale`. */
export const LanguageSection: React.FC = () => {
  const { i18n, t } = useTranslation();
  const active = i18n.language.startsWith('ru') ? 'ru' : 'en';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-200">
        <Languages className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-medium">{t('preferences.language')}</span>
      </div>
      <p className="text-[10px] text-slate-500">{t('preferences.languageHint')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void i18n.changeLanguage('en')}
          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
            active === 'en'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
          }`}
        >
          <span className="text-sm font-medium">{t('preferences.english')}</span>
        </button>
        <button
          type="button"
          onClick={() => void i18n.changeLanguage('ru')}
          className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
            active === 'ru'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
          }`}
        >
          <span className="text-sm font-medium">{t('preferences.russian')}</span>
        </button>
      </div>
    </div>
  );
};
