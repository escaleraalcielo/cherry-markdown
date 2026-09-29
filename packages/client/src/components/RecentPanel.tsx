import { computed, defineComponent, h, ref } from 'vue';
import { t, getActiveLocale, toBcp47 } from '../i18n';
import { useFileStore } from '../store';
import ContextMenu from './ui/ContextMenu';
import { useFileManager } from './composables/useFileManager';
import type { FileInfo } from './types';
import './panels.css';

const formatTime = (time: FileInfo['lastAccessed']): string => {
  if (!time) return '';
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDateKey = (time: FileInfo['lastAccessed']): string => {
  const date = new Date(time || 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * 分组标题：今天 / 昨天用 t()，其余交给 Intl.DateTimeFormat 按当前语言格式化，
 * 这样中英文都不需要手写「年月日 + 星期」数组。
 */
const formatDateLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('recent.today');
  if (date.toDateString() === yesterday.toDateString()) return t('recent.yesterday');

  return new Intl.DateTimeFormat(toBcp47(getActiveLocale()), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date);
};

const formatDirectory = (path: string): string => {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop();
  const directory = parts.join('/');
  if (!directory) return normalized;
  const tail = parts.slice(-2).join('/');
  return tail || directory;
};

export default defineComponent({
  name: 'RecentPanel',
  setup(_, { expose }) {
    const fileStore = useFileStore();
    const {
      sortedRecentFiles,
      currentFilePath,
      openExistingFile,
      openFile,
      openInExplorer,
      copyFilePath,
      removeFromRecent,
      contextMenu,
      showContextMenu,
      hideContextMenu,
    } = useFileManager(fileStore, ref(null));

    const groupedRecentFiles = computed(() => {
      const groups = new Map<string, FileInfo[]>();
      if (fileStore.untitledDraft) {
        groups.set('draft', [fileStore.untitledDraft]);
      }
      for (const file of sortedRecentFiles.value) {
        const key = formatDateKey(file.lastAccessed);
        const group = groups.get(key) || [];
        group.push(file);
        groups.set(key, group);
      }
      return Array.from(groups.entries()).map(([dateKey, files]) => ({
        dateKey,
        label: dateKey === 'draft' ? t('recent.drafts') : formatDateLabel(dateKey),
        files,
      }));
    });

    const openRecentFile = async (): Promise<void> => {
      await openExistingFile();
    };

    const openRecent = async (filePath: string): Promise<void> => {
      await openFile(filePath, false, false);
    };

    const isActiveFile = (file: FileInfo): boolean => {
      if (file.isDraft) return !currentFilePath.value;
      return file.path === currentFilePath.value;
    };

    const remove = (filePath: string): void => {
      removeFromRecent(filePath);
      hideContextMenu();
    };

    expose({ openRecentFile });

    return () =>
      h('div', { class: 'recent-panel' }, [
        !sortedRecentFiles.value.length && !fileStore.untitledDraft
          ? h('div', { class: 'empty' }, [
              h('p', t('recent.empty')),
              h('button', { type: 'button', onClick: openRecentFile }, t('file.openFile')),
            ])
          : h(
              'div',
              { class: 'recent-list' },
              groupedRecentFiles.value.map((group) =>
                h('section', { key: group.dateKey, class: 'recent-group' }, [
                  h('div', { class: 'recent-group-title' }, [
                    h('span', group.label),
                    h('span', t('recent.fileCount', { count: group.files.length })),
                  ]),
                  h(
                    'ul',
                    group.files.map((file) =>
                      h(
                        'li',
                        {
                          key: file.path,
                          class: { active: isActiveFile(file), draft: file.isDraft },
                          title: file.isDraft ? t('file.draftTooltip') : file.path,
                          onClick: () => {
                            if (!file.isDraft) void openRecent(file.path);
                          },
                          onContextmenu: (event: MouseEvent) => {
                            if (file.isDraft) return;
                            event.preventDefault();
                            showContextMenu(event, file);
                          },
                        },
                        [
                          h('div', { class: 'file-row' }, [
                            h('span', { class: 'file-name' }, file.name),
                            h('span', { class: 'file-time' }, file.isDraft ? t('common.unsaved') : formatTime(file.lastAccessed)),
                          ]),
                          h(
                            'div',
                            { class: 'file-path' },
                            file.isDraft ? t('file.draftPath') : formatDirectory(file.path),
                          ),
                        ],
                      ),
                    ),
                  ),
                ]),
              ),
            ),
        contextMenu.value.visible
          ? h(ContextMenu, {
              x: contextMenu.value.x,
              y: contextMenu.value.y,
              file: contextMenu.value.file,
              menuType: 'recent',
              onRemove: remove,
              onCopyPath: copyFilePath,
              onOpenInExplorer: openInExplorer,
              onClose: hideContextMenu,
            })
          : null,
      ]);
  },
});
