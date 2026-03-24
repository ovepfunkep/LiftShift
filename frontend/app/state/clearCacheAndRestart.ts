import { trackEvent, resetUser } from '../../utils/integrations/analytics';
import { computationCache } from '../../utils/storage/computationCache';
import { browserCache } from '../../utils/storage/browserCache';
import {
  clearBodyMapGender,
  clearCSVData,
  clearDateMode,
  clearPreferencesConfirmed,
  clearThemeMode,
  clearWeightUnit,
} from '../../utils/storage/localStorage';
import {
  clearDataSourceChoice,
  clearHevyAuthToken,
  clearHevyProApiKey,
  clearLastCsvPlatform,
  clearLastLoginMethod,
  clearLyfataApiKey,
  clearSetupComplete,
} from '../../utils/storage/dataSourceStorage';
import { clearManualWorkoutSets } from '../../utils/storage/manualWorkoutStorage';

export const clearCacheAndRestart = (): void => {
  trackEvent('cache_clear', {});
  resetUser();
  clearCSVData();
  clearManualWorkoutSets();
  clearHevyAuthToken();
  clearHevyProApiKey();
  clearLyfataApiKey();
  clearDataSourceChoice();
  clearLastCsvPlatform();
  clearLastLoginMethod();
  clearSetupComplete();
  clearWeightUnit();
  clearBodyMapGender();
  clearPreferencesConfirmed();
  clearThemeMode();
  clearDateMode();
  computationCache.clear();
  browserCache.clearAllCache();
  window.location.reload();
};
