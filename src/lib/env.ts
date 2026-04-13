// Environment detection — single source of truth for UI behavior that
// differs between prod and non-prod (dev/staging) Firebase projects.

const PROD_PROJECT_ID = 'hhr-trailer-booking';

export const PROJECT_ID: string = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
export const IS_PROD: boolean = PROJECT_ID === PROD_PROJECT_ID;
export const IS_DEV_ENV: boolean = !IS_PROD;
