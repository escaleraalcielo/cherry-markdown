import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  __bundles,
  getActiveLocale,
  resolveInitialLocale,
  setActiveLocale,
  t,
  toBcp47,
  translate,
  type AppLocale,
} from '../src/i18n';

/** 递归收集所有叶子 key（形如 a.b.c） */
const collectLeafKeys = (node: unknown, prefix = ''): string[] => {
  if (typeof node === 'string') return [prefix];
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectLeafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
};

const withLanguage = (lang: string | undefined, run: () => void): void => {
  const original = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: lang },
    configurable: true,
    writable: true,
  });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      configurable: true,
      writable: true,
    });
  }
};

afterEach(() => {
  setActiveLocale(DEFAULT_LOCALE);
});

describe('locale bundles', () => {
  it('zh_CN and en_US expose exactly the same set of keys', () => {
    const zh = collectLeafKeys(__bundles.zh_CN).sort();
    const en = collectLeafKeys(__bundles.en_US).sort();

    const onlyZh = zh.filter((key) => !en.includes(key));
    const onlyEn = en.filter((key) => !zh.includes(key));

    expect({ onlyZh, onlyEn }).toEqual({ onlyZh: [], onlyEn: [] });
  });

  it('has the same nesting shape in both bundles', () => {
    const shape = (node: unknown): unknown =>
      typeof node === 'string'
        ? 'leaf'
        : Object.fromEntries(
            Object.entries(node as Record<string, unknown>).map(([key, value]) => [key, shape(value)]),
          );

    expect(shape(__bundles.en_US)).toEqual(shape(__bundles.zh_CN));
  });

  it('has no blank values', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of collectLeafKeys(__bundles[locale])) {
        const value = translate(locale, key);
        expect(value, `${locale} -> ${key}`).not.toMatch(/^\s*$/);
      }
    }
  });
});

describe('translate', () => {
  it('returns the bundle value for the requested locale', () => {
    expect(translate('en_US', 'common.save')).toBe('Save');
    expect(translate('zh_CN', 'common.save')).toBe('保存');
  });

  it('interpolates {name} placeholders', () => {
    expect(translate('en_US', 'exportAction.exportedMarkdown', { path: '/tmp/a.md' })).toBe(
      'Exported Markdown: /tmp/a.md',
    );
    expect(translate('zh_CN', 'statusBar.charCount', { count: 12 })).toBe('12 字');
  });

  it('leaves unknown placeholders intact instead of rendering undefined', () => {
    const result = translate('en_US', 'exportAction.exportedMarkdown', { nope: 1 });
    expect(result).toBe('Exported Markdown: {path}');
    expect(result).not.toContain('undefined');
  });

  it('returns the key itself when the key exists in neither bundle', () => {
    expect(translate('en_US', 'definitely.not.a.key')).toBe('definitely.not.a.key');
  });

  it('falls back to zh_CN when a key is missing from en_US', () => {
    const zhOnly = `__onlyZh${Date.now()}`;
    (__bundles.zh_CN as Record<string, unknown>)[zhOnly] = '仅中文';
    try {
      expect(translate('en_US', zhOnly)).toBe('仅中文');
    } finally {
      delete (__bundles.zh_CN as Record<string, unknown>)[zhOnly];
    }
  });
});

describe('locale resolution', () => {
  it('maps English tags to en_US', () => {
    withLanguage('en-US', () => expect(resolveInitialLocale()).toBe('en_US'));
    withLanguage('en-GB', () => expect(resolveInitialLocale()).toBe('en_US'));
    withLanguage('EN', () => expect(resolveInitialLocale()).toBe('en_US'));
  });

  it('maps Chinese tags to zh_CN', () => {
    withLanguage('zh-CN', () => expect(resolveInitialLocale()).toBe('zh_CN'));
    withLanguage('zh-TW', () => expect(resolveInitialLocale()).toBe('zh_CN'));
  });

  it('falls back to Chinese for unsupported tags', () => {
    withLanguage('fr-FR', () => expect(resolveInitialLocale()).toBe('zh_CN'));
    withLanguage('', () => expect(resolveInitialLocale()).toBe('zh_CN'));
  });

  it('falls back to Chinese when navigator has no language', () => {
    withLanguage(undefined, () => expect(resolveInitialLocale()).toBe('zh_CN'));
  });
});

describe('active locale', () => {
  it('t() follows the active locale', () => {
    setActiveLocale('zh_CN');
    expect(getActiveLocale()).toBe('zh_CN');
    expect(t('common.save')).toBe('保存');

    setActiveLocale('en_US');
    expect(getActiveLocale()).toBe('en_US');
    expect(t('common.save')).toBe('Save');
  });

  it('ignores values outside SUPPORTED_LOCALES', () => {
    setActiveLocale('en_US');
    setActiveLocale('fr_FR' as AppLocale);
    expect(getActiveLocale()).toBe('en_US');
  });

  it('starts at the Chinese default', () => {
    expect(DEFAULT_LOCALE).toBe('zh_CN');
  });
});

describe('toBcp47', () => {
  it('converts the underscore form to the hyphen form Intl expects', () => {
    expect(toBcp47('en_US')).toBe('en-US');
    expect(toBcp47('zh_CN')).toBe('zh-CN');
  });

  it('produces tags Intl accepts', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(() => new Intl.DateTimeFormat(toBcp47(locale as AppLocale))).not.toThrow();
    }
  });
});
