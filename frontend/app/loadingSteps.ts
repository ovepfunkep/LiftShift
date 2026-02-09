export const APP_LOADING_STEPS = {
  CONNECT: 0,
  BUILD: 1,
} as const;

export type AppLoadingStep = (typeof APP_LOADING_STEPS)[keyof typeof APP_LOADING_STEPS];
