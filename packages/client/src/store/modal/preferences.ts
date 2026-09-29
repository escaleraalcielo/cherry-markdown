import { defineStore } from 'pinia';
import { resolveInitialLocale, setActiveLocale, type AppLocale } from '../../i18n';

export type EditorMode = 'edit&preview' | 'editOnly' | 'previewOnly';
export type WidthMode = 'fixed' | 'auto';
export type EditorEngine = 'cherry' | 'milkdown';

interface PreferencesState {
  focusMode: boolean;
  widthMode: WidthMode;
  /** 专注模式 - 固定宽度模式下的正文最大宽度（px），仅在 widthMode === 'fixed' 时生效 */
  fixedWidthValue: number;
  editorMode: EditorMode;
  toolbarVisible: boolean;
  engine: EditorEngine;
  /** 界面语言；store 是唯一数据源，写入时同步到 i18n 运行时 */
  locale: AppLocale;
}

const STORAGE_KEY = 'cherry_markdown_ui_preferences';

/** 固定宽度允许的范围（px），避免用户填入极端值导致布局崩坏 */
export const FIXED_WIDTH_MIN = 400;
export const FIXED_WIDTH_MAX = 1600;
export const FIXED_WIDTH_DEFAULT = 800;

const DEFAULT_STATE: PreferencesState = {
  focusMode: false,
  widthMode: 'fixed',
  fixedWidthValue: FIXED_WIDTH_DEFAULT,
  editorMode: 'edit&preview',
  toolbarVisible: true,
  engine: 'cherry',
  locale: resolveInitialLocale(),
};

const isEditorMode = (v: unknown): v is EditorMode => v === 'edit&preview' || v === 'editOnly' || v === 'previewOnly';

const isWidthMode = (v: unknown): v is WidthMode => v === 'fixed' || v === 'auto';

const isEditorEngine = (v: unknown): v is EditorEngine => v === 'cherry' || v === 'milkdown';

const isAppLocale = (v: unknown): v is AppLocale => v === 'zh_CN' || v === 'en_US';

const clampFixedWidth = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : FIXED_WIDTH_DEFAULT;
  return Math.min(FIXED_WIDTH_MAX, Math.max(FIXED_WIDTH_MIN, Math.round(n)));
};

const loadFromStorage = (): PreferencesState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<PreferencesState>;
    return {
      focusMode: typeof parsed.focusMode === 'boolean' ? parsed.focusMode : DEFAULT_STATE.focusMode,
      widthMode: isWidthMode(parsed.widthMode) ? parsed.widthMode : DEFAULT_STATE.widthMode,
      fixedWidthValue: clampFixedWidth(parsed.fixedWidthValue),
      editorMode: isEditorMode(parsed.editorMode) ? parsed.editorMode : DEFAULT_STATE.editorMode,
      toolbarVisible: typeof parsed.toolbarVisible === 'boolean' ? parsed.toolbarVisible : DEFAULT_STATE.toolbarVisible,
      engine: isEditorEngine(parsed.engine) ? parsed.engine : DEFAULT_STATE.engine,
      // 老版本写入的偏好里没有 locale，此时按系统语言推断一次，之后由用户的选择覆盖
      locale: isAppLocale(parsed.locale) ? parsed.locale : resolveInitialLocale(),
    };
  } catch (error) {
    console.warn('加载 UI 偏好失败:', error);
    return { ...DEFAULT_STATE };
  }
};

const saveToStorage = (state: PreferencesState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('保存 UI 偏好失败:', error);
  }
};

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => loadFromStorage(),
  actions: {
    setFocusMode(value: boolean) {
      this.focusMode = value;
      saveToStorage(this.$state);
    },
    setWidthMode(mode: WidthMode) {
      this.widthMode = mode;
      saveToStorage(this.$state);
    },
    setFixedWidthValue(value: number) {
      this.fixedWidthValue = clampFixedWidth(value);
      saveToStorage(this.$state);
    },
    setEditorMode(mode: EditorMode) {
      this.editorMode = mode;
      saveToStorage(this.$state);
    },
    setToolbarVisible(value: boolean) {
      this.toolbarVisible = value;
      saveToStorage(this.$state);
    },
    setEngine(engine: EditorEngine) {
      this.engine = engine;
      saveToStorage(this.$state);
    },
    /**
     * 设置界面语言。store 是唯一数据源，这里同时把值同步给 i18n 运行时，
     * 触发所有在渲染期调用 t() 的组件重渲染。
     */
    setLocale(locale: AppLocale) {
      if (!isAppLocale(locale)) return;
      if (this.locale === locale) {
        // 仍需同步一次运行时，避免运行时与 store 意外失步
        setActiveLocale(locale);
        return;
      }
      this.locale = locale;
      saveToStorage(this.$state);
      setActiveLocale(locale);
    },
  },
});
