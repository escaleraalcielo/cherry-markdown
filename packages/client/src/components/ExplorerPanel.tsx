import { defineComponent, h, nextTick, ref } from 'vue';
import { t } from '../i18n';
import { useDirectoryStore, useFileStore } from '../store';
import { notifyInfo } from '../utils/notifications';
import { loadDirectoryStructure, openDirectoryDialog } from './fileUtils';
import { useFileManager } from './composables/useFileManager';
import ContextMenu from './ui/ContextMenu';
import DirectoryTree from './DirectoryTree';
import type { DirectoryNode } from './types';
import './panels.css';

const cssEscape = (value: string): string => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
};

export default defineComponent({
  name: 'ExplorerPanel',
  setup(_, { expose }) {
    const fileStore = useFileStore();
    const directoryStore = useDirectoryStore();
    const nodes = ref<DirectoryNode[]>([]);
    const currentDirPath = ref<string | null>(null);
    const loading = ref(false);

    const {
      currentFilePath,
      contextMenu,
      copyFilePath,
      openInExplorer,
      showContextMenu,
      hideContextMenu,
      openFile: openFileFromManager,
    } = useFileManager(fileStore, ref(null));

    const applyExpandedState = (items: DirectoryNode[]): DirectoryNode[] =>
      items.map((item) => {
        if (item.type !== 'directory') return item;
        const cached = directoryStore.items.find((entry) => entry.path === item.path);
        return {
          ...item,
          expanded: cached?.expanded ?? item.expanded,
          children: item.children ? applyExpandedState(item.children) : [],
        };
      });

    const loadTree = async (dirPath: string): Promise<void> => {
      loading.value = true;
      try {
        const tree = await loadDirectoryStructure(dirPath, 0, 8);
        if (tree.success && tree.data) {
          currentDirPath.value = dirPath;
          nodes.value = applyExpandedState(tree.data);
          directoryStore.setCurrent(dirPath);
          directoryStore.upsertDirectory(dirPath, true);
        }
      } finally {
        loading.value = false;
      }
    };

    const openDirectory = async (): Promise<void> => {
      const result = await openDirectoryDialog();
      if (!result.success || !result.data) return;
      await loadTree(result.data);
    };

    const updateDirectoryNode = (items: DirectoryNode[], dirPath: string, expanded: boolean): DirectoryNode[] =>
      items.map((item) => {
        if (item.path === dirPath && item.type === 'directory') {
          return { ...item, expanded };
        }
        if (item.type === 'directory' && item.children) {
          return { ...item, children: updateDirectoryNode(item.children, dirPath, expanded) };
        }
        return item;
      });

    const toggleDirectory = (_dirPath: string, node: DirectoryNode): void => {
      const expanded = !(node.expanded ?? false);
      nodes.value = updateDirectoryNode(nodes.value, node.path, expanded);
      directoryStore.setExpanded(node.path, expanded);
    };

    const openFile = async (filePath: string): Promise<void> => {
      await openFileFromManager(filePath, true);
    };

    const refreshDirectory = async (): Promise<void> => {
      if (!currentDirPath.value) {
        await openDirectory();
        return;
      }
      await loadTree(currentDirPath.value);
    };

    const findNodePath = (items: DirectoryNode[], targetPath: string, parents: string[] = []): string[] | null => {
      for (const item of items) {
        if (item.path === targetPath) return [...parents, item.path];
        if (item.type === 'directory' && item.children?.length) {
          const found = findNodePath(item.children, targetPath, [...parents, item.path]);
          if (found) return found;
        }
      }
      return null;
    };

    const expandAncestors = (paths: string[]): void => {
      for (const path of paths) {
        nodes.value = updateDirectoryNode(nodes.value, path, true);
        directoryStore.setExpanded(path, true);
      }
    };

    const revealCurrentFile = async (): Promise<void> => {
      const currentPath = currentFilePath.value;
      if (!currentPath) {
        notifyInfo(t('explorer.noOpenFile'));
        return;
      }

      const target = findNodePath(nodes.value, currentPath);
      if (!target) {
        notifyInfo(t('explorer.fileNotInDirectory'));
        return;
      }

      expandAncestors(target.slice(0, -1));
      await nextTick();
      const targetElement = document.querySelector<HTMLElement>(
        `.explorer-panel [data-path="${cssEscape(currentPath)}"]`,
      );
      targetElement?.scrollIntoView({ block: 'center' });
    };

    const restore = async (): Promise<void> => {
      if (directoryStore.currentPath) {
        await loadTree(directoryStore.currentPath);
      }
    };

    const renderDraftFile = () => {
      const draft = fileStore.untitledDraft;
      if (!draft) return null;

      return h('section', { class: 'draft-section' }, [
        h('div', { class: 'recent-group-title' }, [h('span', t('recent.drafts')), h('span', t('common.unsaved'))]),
        h('ul', { class: 'draft-list' }, [
          h(
            'li',
            {
              class: ['draft-file', { active: !currentFilePath.value }],
              title: t('file.draftTooltip'),
            },
            [
              h('div', { class: 'file-row' }, [
                h('span', { class: 'file-name' }, draft.name),
                h('span', { class: 'file-time' }, t('common.unsaved')),
              ]),
              h('div', { class: 'file-path' }, t('file.draftPath')),
            ],
          ),
        ]),
      ]);
    };

    expose({ openDirectory, refreshDirectory, revealCurrentFile });
    void restore();

    const renderBody = () => {
      if (loading.value) {
        return h('div', { class: 'empty-state' }, t('common.loading'));
      }

      if (!nodes.value.length && !fileStore.untitledDraft) {
        return h('div', { class: 'empty-state actionable' }, [
          h('p', currentDirPath.value ? t('explorer.noEditableFiles') : t('explorer.selectDirectory')),
          h('button', { type: 'button', onClick: openDirectory }, t('explorer.openDirectory')),
        ]);
      }

      return h('div', { class: 'tree-wrapper' }, [
        renderDraftFile(),
        nodes.value.length
          ? h(DirectoryTree, {
              nodes: nodes.value,
              currentFilePath: currentFilePath.value,
              onToggleDirectory: toggleDirectory,
              onOpenFile: openFile,
              onContextMenu: showContextMenu,
            })
          : null,
      ]);
    };

    return () =>
      h('div', { class: 'explorer-panel' }, [
        h('div', { class: 'path-bar' }, [
          currentDirPath.value
            ? h('span', { class: 'path-text', title: currentDirPath.value }, currentDirPath.value)
            : h('span', { class: 'path-placeholder' }, t('explorer.noDirectorySelected')),
        ]),
        renderBody(),
        contextMenu.value.visible
          ? h(ContextMenu, {
              x: contextMenu.value.x,
              y: contextMenu.value.y,
              file: contextMenu.value.file,
              menuType: 'directory',
              onCopyPath: copyFilePath,
              onOpenInExplorer: openInExplorer,
              onClose: hideContextMenu,
            })
          : null,
      ]);
  },
});
