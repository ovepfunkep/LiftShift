import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, Users } from 'lucide-react';
import { WeightUnit } from '../../../utils/storage/localStorage';
import { BodyMapGender } from '../../bodyMap/BodyMap';

interface WeightUnitSectionProps {
  weightUnit: WeightUnit;
  onWeightUnitChange: (unit: WeightUnit) => void;
}

export const WeightUnitSection: React.FC<WeightUnitSectionProps> = ({ weightUnit, onWeightUnitChange }) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-slate-200">
      <Scale className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-medium">{t('preferences.weightUnit')}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onWeightUnitChange('kg')}
        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
          weightUnit === 'kg'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
        }`}
      >
        <span className="text-sm font-bold">kg</span>
      </button>
      <button
        type="button"
        onClick={() => onWeightUnitChange('lbs')}
        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
          weightUnit === 'lbs'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
        }`}
      >
        <span className="text-sm font-bold">lbs</span>
      </button>
    </div>
  </div>
  );
};

interface BodyMapGenderSectionProps {
  bodyMapGender: BodyMapGender;
  onBodyMapGenderChange: (gender: BodyMapGender) => void;
}

export const BodyMapGenderSection: React.FC<BodyMapGenderSectionProps> = ({
  bodyMapGender,
  onBodyMapGenderChange,
}) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-slate-200">
      <Users className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-xs font-medium">{t('preferences.bodyMapStyle')}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onBodyMapGenderChange('male')}
        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
          bodyMapGender === 'male'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
        }`}
      >
        <span className="text-sm font-medium">{t('preferences.male')}</span>
      </button>
      <button
        type="button"
        onClick={() => onBodyMapGenderChange('female')}
        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border transition-all ${
          bodyMapGender === 'female'
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
        }`}
      >
        <span className="text-sm font-medium">{t('preferences.female')}</span>
      </button>
    </div>
  </div>
  );
};
