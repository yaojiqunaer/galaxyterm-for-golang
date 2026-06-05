import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const dictionaries = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const localeStorageKey = 'galaxyterm.locale';

function detectLocale() {
  const savedLocale = localStorage.getItem(localeStorageKey);
  if (dictionaries[savedLocale]) {
    return savedLocale;
  }
  const language = navigator.language || 'en-US';
  if (dictionaries[language]) {
    return language;
  }
  if (language.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

export const currentLocale = detectLocale();

export function t(key, fallback = key) {
  return dictionaries[currentLocale]?.[key] || dictionaries['en-US']?.[key] || fallback;
}

export function setLocale(locale) {
  if (dictionaries[locale]) {
    localStorage.setItem(localeStorageKey, locale);
  }
}

export function availableLocales() {
  return Object.keys(dictionaries);
}
