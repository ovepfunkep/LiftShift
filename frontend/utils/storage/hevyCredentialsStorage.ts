const HEVY_USERNAME_KEY = 'hevy_username_or_email';
const HEVY_PASSWORD_KEY = 'hevy_password';

export const saveHevyUsernameOrEmail = (value: string): void => {
  try {
    localStorage.setItem(HEVY_USERNAME_KEY, value);
  } catch {
  }
};

export const getHevyUsernameOrEmail = (): string | null => {
  try {
    return localStorage.getItem(HEVY_USERNAME_KEY);
  } catch {
    return null;
  }
};

export const clearHevyUsernameOrEmail = (): void => {
  try {
    localStorage.removeItem(HEVY_USERNAME_KEY);
  } catch {
  }
};

export const saveHevyPassword = (password: string): void => {
  try {
    localStorage.setItem(HEVY_PASSWORD_KEY, password);
  } catch {
  }
};

export const getHevyPassword = (): string | null => {
  try {
    return localStorage.getItem(HEVY_PASSWORD_KEY);
  } catch {
    return null;
  }
};

export const clearHevyPassword = (): void => {
  try {
    localStorage.removeItem(HEVY_PASSWORD_KEY);
  } catch {
  }
};

export const clearHevyCredentials = (): void => {
  clearHevyUsernameOrEmail();
  clearHevyPassword();
};
