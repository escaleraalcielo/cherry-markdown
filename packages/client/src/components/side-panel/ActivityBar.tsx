import { t } from '../../i18n';
import { defineComponent, h, type PropType } from 'vue';
import { ArrowIcon, SettingsIcon } from '../icons';
import type { ActivityPanelDefinition } from './types';

// Left-side activity bar: top panel switcher + bottom collapse/settings/version.
export default defineComponent({
  name: 'ActivityBar',
  props: {
    panels: {
      type: Array as PropType<ActivityPanelDefinition[]>,
      required: true,
    },
    activePanelId: {
      type: String,
      required: true,
    },
    isCollapsed: {
      type: Boolean,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
  },
  emits: {
    selectPanel: (_panelId: string) => true,
    toggleCollapse: () => true,
    openSettings: () => true,
  },
  setup(props, { emit }) {
    return () =>
      h('nav', { class: 'activity-bar', 'aria-label': t('sidePanel.activityBar') }, [
        h(
          'div',
          { class: 'activity-buttons' },
          props.panels.map((panel) =>
            h(
              'button',
              {
                key: panel.id,
                class: ['activity-btn', { active: panel.id === props.activePanelId }],
                title: t(panel.labelKey),
                'aria-label': t(panel.labelKey),
                onClick: () => emit('selectPanel', panel.id),
              },
              [h(panel.icon, { size: 18 })],
            ),
          ),
        ),
        h('div', { class: 'activity-footer' }, [
          h(
            'button',
            {
              class: 'activity-btn compact',
              title: props.isCollapsed ? t('sidePanel.expand') : t('sidePanel.collapse'),
              'aria-label': props.isCollapsed ? t('sidePanel.expand') : t('sidePanel.collapse'),
              onClick: () => emit('toggleCollapse'),
            },
            [h(ArrowIcon, { size: 14, direction: props.isCollapsed ? 'right' : 'left' })],
          ),
          h(
            'button',
            {
              class: 'activity-btn compact',
              title: t('settings.title'),
              'aria-label': t('settings.title'),
              onClick: () => emit('openSettings'),
            },
            [h(SettingsIcon, { size: 16 })],
          ),
          h('span', { class: 'version-text', title: t('sidePanel.currentVersion') }, `v${props.version}`),
        ]),
      ]);
  },
});
