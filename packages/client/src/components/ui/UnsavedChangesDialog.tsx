import { defineComponent, h, Teleport, Transition } from 'vue';
import { t } from '../../i18n';
import './ui.css';

export type UnsavedDialogResult = 'save' | 'discard' | 'cancel';

export default defineComponent({
  name: 'UnsavedChangesDialog',
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
  },
  emits: {
    close: (_result: UnsavedDialogResult) => true,
  },
  setup(props, { emit }) {
    const handleAction = (result: UnsavedDialogResult): void => emit('close', result);

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
                        if (event.target === event.currentTarget) handleAction('cancel');
                      },
                    },
                    [
                      h('div', { class: 'dialog-content' }, [
                        h('h3', { class: 'dialog-title' }, t('unsavedDialog.title')),
                        h('p', { class: 'dialog-message' }, t('unsavedDialog.message')),
                        h('div', { class: 'dialog-actions' }, [
                          h(
                            'button',
                            { class: 'btn btn-primary', onClick: () => handleAction('save') },
                            t('unsavedDialog.saveAndContinue'),
                          ),
                          h(
                            'button',
                            { class: 'btn btn-danger', onClick: () => handleAction('discard') },
                            t('unsavedDialog.discard'),
                          ),
                          h(
                            'button',
                            { class: 'btn btn-secondary', onClick: () => handleAction('cancel') },
                            t('common.cancel'),
                          ),
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
