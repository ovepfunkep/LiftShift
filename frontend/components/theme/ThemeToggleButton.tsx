import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const ThemeToggleButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { mode, cycleMode } = useTheme();

  const labelForMode = (m: string) => {
    switch (m) {
      case 'light':
        return t('themeToggle.day');
      case 'medium-dark':
        return t('themeToggle.medium');
      case 'midnight-dark':
        return t('themeToggle.midnight');
      case 'pure-black':
        return t('themeToggle.pureBlack');
      default:
        return t('themeToggle.theme');
    }
  };

  const { Icon } = useMemo(() => {
    if (mode === 'light') return { Icon: Sun };
    if (mode === 'medium-dark') return { Icon: Moon };
    if (mode === 'midnight-dark') return { Icon: Sparkles };
    if (mode === 'pure-black') return { Icon: Moon };
    return { Icon: Moon };
  }, [mode]);

  const title = t('themeToggle.cycleTitle', { label: labelForMode(mode) });

  const getDotPosition = (index: number) => {
    const themeOrder = ['pure-black', 'light', 'midnight-dark', 'medium-dark'];
    const currentIndex = themeOrder.indexOf(mode);
    const dotIndex = themeOrder.indexOf(
      index === 0 ? 'pure-black' :
      index === 1 ? 'light' :
      index === 2 ? 'midnight-dark' :
      'medium-dark'
    );
    return dotIndex === currentIndex;
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      className={
        className ??
        `inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${compact ? 'h-9 w-9' : 'h-10 w-10'} bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200`
      }
      title={title}
      aria-label={title}
    >
      <div className="relative">
        <Icon className="w-4 h-4" />
        {/* Theme indicator dots */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-1 h-1 rounded-full transition-all duration-200 ${
                getDotPosition(index) 
                  ? mode === 'light' ? 'bg-gray-800' : 'bg-white' 
                  : mode === 'light' ? 'bg-gray-400/60' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
};
