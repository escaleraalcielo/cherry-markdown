import type { Component } from 'vue';

/**
 * 面板标题与操作项只保存 i18n key，展示文案在渲染时用 t() 取。
 * 若在这里存已翻译的字符串，语言切换后不会更新。
 */
export interface ActivityPanelDefinition {
  id: string;
  labelKey: string;
  icon: Component;
}

export interface PanelHeaderAction {
  id: string;
  labelKey: string;
  icon: Component;
  disabled?: boolean;
  disabledReasonKey?: string;
}
