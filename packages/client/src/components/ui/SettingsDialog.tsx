import { defineComponent, h, Teleport, Transition, ref, computed, watch } from 'vue';
import { useImageBedStore, usePreferencesStore, type ImageBedProvider, type ImageBedState } from '../../store';
import { FIXED_WIDTH_DEFAULT, FIXED_WIDTH_MAX, FIXED_WIDTH_MIN } from '../../store/modal/preferences';
import { testImageBedConnection } from '../composables/useImageBedUploader';
import { t } from '../../i18n';
import { SUPPORTED_LOCALES, LOCALE_LABELS, type AppLocale } from '../../i18n';
import './settings-dialog.css';

const PROVIDER_OPTIONS: Array<{ value: ImageBedProvider; labelKey: string; hintKey: string }> = [
  { value: 'none', labelKey: 'settings.providers.none.label', hintKey: 'settings.providers.none.hint' },
  { value: 'picgo', labelKey: 'settings.providers.picgo.label', hintKey: 'settings.providers.picgo.hint' },
  { value: 'custom', labelKey: 'settings.providers.custom.label', hintKey: 'settings.providers.custom.hint' },
];

type TestResult = { ok: boolean; message: string } | null;

export default defineComponent({
  name: 'SettingsDialog',
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    close: () => true,
  },
  setup(props, { emit }) {
    const store = useImageBedStore();
    const preferences = usePreferencesStore();

    // Local draft: only committed to store on "保存"; discarded on "取消"
    const draft = ref<ImageBedState>(cloneState(store.$state));
    // 专注模式 - 固定宽度草稿（px）；同样只在“保存”时提交
    const fixedWidthDraft = ref<number>(preferences.fixedWidthValue);

    // 每次弹窗打开时，用最新的 store 状态刷新草稿
    watch(
      () => props.visible,
      (v) => {
        if (v) {
          draft.value = cloneState(store.$state);
          fixedWidthDraft.value = preferences.fixedWidthValue;
          testResult.value = null;
        }
      },
    );

    const testing = ref(false);
    const testResult = ref<TestResult>(null);

    const canTest = computed(() => draft.value.provider === 'picgo' || draft.value.provider === 'custom');

    const handleTest = async (): Promise<void> => {
      if (!canTest.value) return;
      testing.value = true;
      testResult.value = null;
      try {
        testResult.value = await testImageBedConnection(draft.value.provider as 'picgo' | 'custom', draft.value);
      } finally {
        testing.value = false;
      }
    };

    const handleSave = (): void => {
      store.replaceAll(cloneState(draft.value));
      // 固定宽度：写回前需限制到合法范围内，store 内部也会再做一次 clamp
      const raw = Number(fixedWidthDraft.value);
      const px = Number.isFinite(raw) ? raw : FIXED_WIDTH_DEFAULT;
      preferences.setFixedWidthValue(Math.min(FIXED_WIDTH_MAX, Math.max(FIXED_WIDTH_MIN, Math.round(px))));
      emit('close');
    };

    const handleCancel = (): void => {
      emit('close');
    };

    /**
     * 语言与其它设置不同：立即生效，不走「草稿 → 保存」的流程。
     * 这样用户在选择的过程中就能看到界面语言跟着变，选择器本身是自解释的。
     * store 的 setLocale 会负责持久化，并把语言推送给编辑器。
     */
    const handleLocaleChange = (event: Event): void => {
      const value = (event.target as HTMLSelectElement).value;
      if (value === 'zh_CN' || value === 'en_US') {
        preferences.setLocale(value as AppLocale);
      }
    };

    const addHeader = (): void => {
      draft.value.custom.headers = [...draft.value.custom.headers, { key: '', value: '' }];
    };

    const removeHeader = (index: number): void => {
      draft.value.custom.headers = draft.value.custom.headers.filter((_, i) => i !== index);
    };

    return () =>
      h(Teleport, { to: 'body' }, [
        h(
          Transition,
          { name: 'dialog-fade' },
          {
            default: () =>
              props.visible
                ? h(
                    'div',
                    {
                      class: 'dialog-overlay',
                      onClick: (event: MouseEvent) => {
                        if (event.target === event.currentTarget) handleCancel();
                      },
                    },
                    [
                      h('div', { class: 'dialog-content settings-dialog' }, [
                        h('h3', { class: 'dialog-title' }, t('settings.title')),

                        // ==== 语言分节 ====
                        h('section', { class: 'settings-section' }, [
                          h('h4', { class: 'settings-section-title' }, t('settings.language')),
                          h('p', { class: 'settings-section-desc' }, t('settings.languageDesc')),
                          h('div', { class: 'settings-form' }, [
                            h('label', { class: 'settings-field' }, [
                              h('span', { class: 'settings-field-label' }, t('settings.language')),
                              h(
                                'select',
                                {
                                  class: 'settings-input',
                                  value: preferences.locale,
                                  onChange: handleLocaleChange,
                                },
                                SUPPORTED_LOCALES.map((locale) =>
                                  h('option', { key: locale, value: locale }, LOCALE_LABELS[locale]),
                                ),
                              ),
                            ]),
                          ]),
                        ]),

                        // ==== 专注模式分节 ====
                        h('section', { class: 'settings-section' }, [
                          h('h4', { class: 'settings-section-title' }, t('settings.focusMode')),
                          h('p', { class: 'settings-section-desc' }, t('settings.focusModeDesc')),
                          h('div', { class: 'settings-form' }, [
                            h('label', { class: 'settings-field' }, [
                              h('span', { class: 'settings-field-label' }, t('settings.fixedWidth')),
                              h('input', {
                                class: 'settings-input',
                                type: 'number',
                                min: FIXED_WIDTH_MIN,
                                max: FIXED_WIDTH_MAX,
                                step: 20,
                                value: fixedWidthDraft.value,
                                placeholder: String(FIXED_WIDTH_DEFAULT),
                                onInput: (e: Event) => {
                                  const v = Number((e.target as HTMLInputElement).value);
                                  fixedWidthDraft.value = Number.isFinite(v) ? v : FIXED_WIDTH_DEFAULT;
                                },
                              }),
                              h(
                                'span',
                                { class: 'settings-field-hint' },
                                t('settings.fixedWidthHint', {
                                  min: FIXED_WIDTH_MIN,
                                  max: FIXED_WIDTH_MAX,
                                  default: FIXED_WIDTH_DEFAULT,
                                }),
                              ),
                            ]),
                          ]),
                        ]),

                        // ==== 图床设置分节 ====
                        h('section', { class: 'settings-section' }, [
                          h('h4', { class: 'settings-section-title' }, t('settings.imageBed')),
                          h(
                            'p',
                            { class: 'settings-section-desc' },
                            t('settings.imageBedDesc'),
                          ),

                          // Provider radio group
                          h(
                            'div',
                            { class: 'settings-provider-list' },
                            PROVIDER_OPTIONS.map((opt) =>
                              h(
                                'label',
                                {
                                  class: ['settings-provider-item', { active: draft.value.provider === opt.value }],
                                },
                                [
                                  h('input', {
                                    type: 'radio',
                                    name: 'image-bed-provider',
                                    value: opt.value,
                                    checked: draft.value.provider === opt.value,
                                    onChange: () => {
                                      draft.value.provider = opt.value;
                                      testResult.value = null;
                                    },
                                  }),
                                  h('div', { class: 'settings-provider-text' }, [
                                    h('div', { class: 'settings-provider-label' }, t(opt.labelKey)),
                                    h('div', { class: 'settings-provider-hint' }, t(opt.hintKey)),
                                  ]),
                                ],
                              ),
                            ),
                          ),

                          // PicGo config
                          draft.value.provider === 'picgo'
                            ? h('div', { class: 'settings-form' }, [
                                h('label', { class: 'settings-field' }, [
                                  h('span', { class: 'settings-field-label' }, t('settings.picgoUrl')),
                                  h('input', {
                                    class: 'settings-input',
                                    type: 'text',
                                    value: draft.value.picgo.url,
                                    placeholder: 'http://127.0.0.1:36677/upload',
                                    onInput: (e: Event) => {
                                      draft.value.picgo.url = (e.target as HTMLInputElement).value;
                                    },
                                  }),
                                  h(
                                    'span',
                                    { class: 'settings-field-hint' },
                                    t('settings.picgoUrlHint'),
                                  ),
                                ]),
                              ])
                            : null,

                          // Custom uploader config
                          draft.value.provider === 'custom'
                            ? h('div', { class: 'settings-form' }, [
                                h('label', { class: 'settings-field' }, [
                                  h('span', { class: 'settings-field-label' }, t('settings.uploadUrl')),
                                  h('input', {
                                    class: 'settings-input',
                                    type: 'text',
                                    value: draft.value.custom.url,
                                    placeholder: 'https://your-server.com/upload',
                                    onInput: (e: Event) => {
                                      draft.value.custom.url = (e.target as HTMLInputElement).value;
                                    },
                                  }),
                                ]),
                                h('label', { class: 'settings-field' }, [
                                  h('span', { class: 'settings-field-label' }, t('settings.formField')),
                                  h('input', {
                                    class: 'settings-input',
                                    type: 'text',
                                    value: draft.value.custom.fieldName,
                                    placeholder: 'file',
                                    onInput: (e: Event) => {
                                      draft.value.custom.fieldName = (e.target as HTMLInputElement).value;
                                    },
                                  }),
                                  h(
                                    'span',
                                    { class: 'settings-field-hint' },
                                    t('settings.formFieldHint'),
                                  ),
                                ]),
                                h('label', { class: 'settings-field' }, [
                                  h('span', { class: 'settings-field-label' }, t('settings.responseUrlPath')),
                                  h('input', {
                                    class: 'settings-input',
                                    type: 'text',
                                    value: draft.value.custom.responseUrlPath,
                                    placeholder: 'data.url',
                                    onInput: (e: Event) => {
                                      draft.value.custom.responseUrlPath = (e.target as HTMLInputElement).value;
                                    },
                                  }),
                                  h(
                                    'span',
                                    { class: 'settings-field-hint' },
                                    t('settings.responseUrlPathHint'),
                                  ),
                                ]),
                                h('div', { class: 'settings-field' }, [
                                  h('div', { class: 'settings-headers-header' }, [
                                    h('span', { class: 'settings-field-label' }, t('settings.customHeaders')),
                                    h(
                                      'button',
                                      {
                                        class: 'settings-btn-mini',
                                        type: 'button',
                                        onClick: addHeader,
                                      },
                                      t('common.add'),
                                    ),
                                  ]),
                                  ...draft.value.custom.headers.map((header, index) =>
                                    h('div', { class: 'settings-header-row', key: index }, [
                                      h('input', {
                                        class: 'settings-input',
                                        type: 'text',
                                        value: header.key,
                                        placeholder: t('settings.headerNamePlaceholder'),
                                        onInput: (e: Event) => {
                                          draft.value.custom.headers[index].key = (e.target as HTMLInputElement).value;
                                        },
                                      }),
                                      h('input', {
                                        class: 'settings-input',
                                        type: 'text',
                                        value: header.value,
                                        placeholder: t('settings.headerValuePlaceholder'),
                                        onInput: (e: Event) => {
                                          draft.value.custom.headers[index].value = (
                                            e.target as HTMLInputElement
                                          ).value;
                                        },
                                      }),
                                      h(
                                        'button',
                                        {
                                          class: 'settings-btn-mini danger',
                                          type: 'button',
                                          onClick: () => removeHeader(index),
                                        },
                                        t('common.delete'),
                                      ),
                                    ]),
                                  ),
                                ]),
                              ])
                            : null,

                          // Test connection block
                          canTest.value
                            ? h('div', { class: 'settings-test-row' }, [
                                h(
                                  'button',
                                  {
                                    class: 'btn btn-secondary',
                                    type: 'button',
                                    disabled: testing.value,
                                    onClick: handleTest,
                                  },
                                  t(testing.value ? 'settings.testing' : 'settings.testConnection'),
                                ),
                                testResult.value
                                  ? h(
                                      'span',
                                      {
                                        class: ['settings-test-result', testResult.value.ok ? 'ok' : 'err'],
                                      },
                                      testResult.value.message,
                                    )
                                  : null,
                              ])
                            : null,
                        ]),

                        // ==== 底部操作按钮 ====
                        h('div', { class: 'dialog-actions' }, [
                          h('button', { class: 'btn btn-primary', onClick: handleSave }, t('common.save')),
                          h('button', { class: 'btn btn-secondary', onClick: handleCancel }, t('common.cancel')),
                        ]),
                      ]),
                    ],
                  )
                : null,
          },
        ),
      ]);
  },
});

function cloneState(state: ImageBedState): ImageBedState {
  return {
    provider: state.provider,
    picgo: { ...state.picgo },
    custom: {
      url: state.custom.url,
      fieldName: state.custom.fieldName,
      responseUrlPath: state.custom.responseUrlPath,
      headers: state.custom.headers.map((h) => ({ ...h })),
    },
  };
}
