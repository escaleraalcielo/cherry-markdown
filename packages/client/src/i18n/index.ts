/**
 * 客户端国际化运行时
 *
 * 设计要点：
 * 1. 本模块不依赖 Pinia，避免 store 与 i18n 之间形成循环引用。
 *    activeLocale 由 preferences store 单向写入（store 是唯一数据源）。
 * 2. activeLocale 是一个 ref：在渲染函数中调用 t() 会建立响应式依赖，
 *    语言切换后 Vue 会自动重渲染；在普通函数中调用则是取当前值的快照。
 * 3. t() 必须在渲染期调用。如果把 t() 的结果提升到模块级常量，
 *    编译不会报错，但语言切换后文案不会更新——这是最容易踩的坑。
 */
import { ref, computed, type ComputedRef, type Ref } from 'vue';
import zhCN, { type TranslationTree } from './zh_CN';
import enUS from './en_US';

export const SUPPORTED_LOCALES = ['zh_CN', 'en_US'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** 未识别的系统语言一律回落到中文 */
export const DEFAULT_LOCALE: AppLocale = 'zh_CN';

const BUNDLES: Record<AppLocale, TranslationTree> = {
  zh_CN: zhCN,
  en_US: enUS,
};

/** 展示用的语言名称，始终使用各自语言的自称 */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  zh_CN: '中文',
  en_US: 'English',
};

const isAppLocale = (value: unknown): value is AppLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

/** 当前生效语言；由 preferences store 在启动与 setLocale 时写入 */
const activeLocale: Ref<AppLocale> = ref(DEFAULT_LOCALE);

export const getActiveLocale = (): AppLocale => activeLocale.value;

export const setActiveLocale = (locale: AppLocale): void => {
  if (isAppLocale(locale)) activeLocale.value = locale;
};

/** zh_CN -> zh-CN，供 Intl 与 <html lang> 使用 */
export const toBcp47 = (locale: AppLocale): string => locale.replace('_', '-');

/**
 * 依据系统语言决定首次启动语言。
 * 识别不出（或没有 navigator）时回落到中文。
 */
export const resolveInitialLocale = (): AppLocale => {
  const tag = typeof navigator !== 'undefined' ? navigator.language : undefined;
  if (!tag) return DEFAULT_LOCALE;
  const lower = tag.toLowerCase();
  if (lower.startsWith('zh')) return 'zh_CN';
  if (lower.startsWith('en')) return 'en_US';
  return DEFAULT_LOCALE;
};

const lookup = (bundle: TranslationTree, key: string): string | undefined => {
  let node: string | TranslationTree | undefined = bundle;
  for (const segment of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
};

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
};

/**
 * 取指定语言的文案。找不到时依次回落到中文、再回落到 key 本身，
 * 让缺漏在界面上表现为一个可见的 key，便于排查。
 */
export const translate = (
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string => {
  const primary = lookup(BUNDLES[locale] ?? BUNDLES[DEFAULT_LOCALE], key);
  if (primary !== undefined) return interpolate(primary, params);

  const fallback = lookup(BUNDLES[DEFAULT_LOCALE], key);
  if (fallback !== undefined) {
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] 缺少翻译：${locale} -> ${key}，已回落到中文`);
    }
    return interpolate(fallback, params);
  }

  if (import.meta.env?.DEV) {
    console.warn(`[i18n] 未知的文案 key：${key}`);
  }
  return key;
};

/** 取当前语言下的文案；需在渲染期调用才会自动跟随语言切换 */
export const t = (key: string, params?: Record<string, string | number>): string =>
  translate(activeLocale.value, key, params);

/**
 * 组件内使用。返回的 t 与 computed 在渲染函数里都会跟随语言切换。
 * 不依赖 Pinia，因此普通函数与非组件模块也能安全调用。
 */
export const useI18n = (): {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: ComputedRef<AppLocale>;
  setLocale: (locale: AppLocale) => void;
  toBcp47: (locale: AppLocale) => string;
} => ({
  t,
  locale: computed(() => activeLocale.value),
  setLocale: setActiveLocale,
  toBcp47,
});

/** 供单测使用：直接拿到文案表 */
export const __bundles = BUNDLES;
