export type UiLocale = 'zh' | 'en';

export type TranslationKey = keyof typeof import('./locales/en.json');

export type TranslationMap = Record<TranslationKey, string>;
