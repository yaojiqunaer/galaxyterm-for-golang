import zhCN from './locales/zh-CN.json' with { type: 'json' };
import enUS from './locales/en-US.json' with { type: 'json' };

const dictionaries = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const extensionDictionaries = {};

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

let activeLocale = detectLocale();

export function t(key, fallbackOrValues = key) {
  const values = isPlainObject(fallbackOrValues) ? fallbackOrValues : null;
  const fallback = values ? key : fallbackOrValues;
  const template = extensionDictionaries[activeLocale]?.[key]
    || dictionaries[activeLocale]?.[key]
    || extensionDictionaries['en-US']?.[key]
    || dictionaries['en-US']?.[key]
    || fallback;
  if (!values || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}

export function currentLocale() {
  return activeLocale;
}

export function setLocale(locale) {
  if (dictionaries[locale]) {
    activeLocale = locale;
    localStorage.setItem(localeStorageKey, locale);
  }
}

export function availableLocales() {
  return Object.keys(dictionaries);
}

export function replaceExtensionMessages(locale, messages = {}) {
  extensionDictionaries[locale] = Object.fromEntries(
    Object.entries(isPlainObject(messages) ? messages : {})
      .filter(([key, value]) => key.startsWith('extension.') && typeof value === 'string'),
  );
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
