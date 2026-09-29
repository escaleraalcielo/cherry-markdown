import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ref } from 'vue';
import { t } from '../../i18n';
import { SUPPORTED_FILE_EXTENSIONS } from '../../constants/files';
import { usePreferencesStore, useFileStore } from '../../store';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notifications';
import { normalizePath } from '../fileUtils';
import type { FileOperationResult } from '../types';
import type { OpenFileFromSidebarEvent } from './useAppEvents';

/** 当前适合 Milkdown 引擎的最大字节数（近似 200KB）
 * 超过阈值时自动切回 Cherry 引擎，避免 Milkdown 将大文件全量重建 AST 导致卡顶。
 */
const MILKDOWN_MAX_BYTES = 200 * 1024;

interface UseAppFileOperationsOptions {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  /**
   * 清空编辑器 undo/redo 历史栈。切换文件（新建 / 打开 / 侧边栏切换 / 启动恢复）
   * 时在 setMarkdown 之后调用，避免用户误按 Ctrl+Z 撤销回上一个文件的内容。
   */
  clearUndoRedo: () => void;
  scrollPreviewToTop: () => void;
  setUnsavedChanges: (value: boolean) => void;
  confirmProceedWhenUnsaved: (saveMarkdown: () => Promise<FileOperationResult>) => Promise<boolean>;
  updateTitle: (path: string | null, unsaved?: boolean) => Promise<void>;
}

export function useAppFileOperations({
  getMarkdown,
  setMarkdown,
  clearUndoRedo,
  scrollPreviewToTop,
  setUnsavedChanges,
  confirmProceedWhenUnsaved,
  updateTitle,
}: UseAppFileOperationsOptions) {
  const fileStore = useFileStore();
  const preferences = usePreferencesStore();
  const isLoading = ref(false);

  /** 大文件保护：若当前引擎为 milkdown 且内容体积超过阈值，自动切回 Cherry。 */
  const guardLargeFileForMilkdown = (markdown: string): void => {
    if (preferences.engine !== 'milkdown') return;
    const { size } = new Blob([markdown]);
    if (size <= MILKDOWN_MAX_BYTES) return;
    preferences.setEngine('cherry');
    notifyInfo(
      t('editor.sizeThresholdWarning', { size: (size / 1024).toFixed(1), max: MILKDOWN_MAX_BYTES / 1024 }),
    );
  };

  const markClean = async (path: string | null): Promise<void> => {
    setUnsavedChanges(false);
    await updateTitle(path, false);
  };

  const saveAsNewMarkdown = async (): Promise<FileOperationResult> => {
    if (isLoading.value) return { success: false, error: t('file.userCancelled') };
    isLoading.value = true;
    try {
      const path = await save({
        filters: [
          {
            name: 'Cherry Markdown',
            extensions: SUPPORTED_FILE_EXTENSIONS,
          },
        ],
      });

      if (!path) {
        return { success: false, error: t('file.userCancelledSave') };
      }

      const normalizedPath = normalizePath(path);
      await writeTextFile(normalizedPath, getMarkdown());
      fileStore.setCurrentFilePath(normalizedPath);
      fileStore.clearUntitledDraft();
      fileStore.addRecentFile(normalizedPath);
      fileStore.markSaved(normalizedPath);
      await markClean(normalizedPath);
      notifySuccess(t('file.saveAsSuccess'));

      return { success: true, path: normalizedPath };
    } catch (error) {
      const message = `${t('file.saveAsFailed')}: ${error instanceof Error ? error.message : t('common.unknownError')}`;
      notifyError(message);
      return { success: false, error: error instanceof Error ? error.message : t('common.unknownError') };
    } finally {
      isLoading.value = false;
    }
  };

  const saveMarkdown = async (): Promise<FileOperationResult> => {
    try {
      if (!fileStore.currentFilePath) {
        return await saveAsNewMarkdown();
      }

      const normalizedPath = normalizePath(fileStore.currentFilePath);
      await writeTextFile(normalizedPath, getMarkdown());
      fileStore.markSaved(normalizedPath);
      await markClean(normalizedPath);
      notifySuccess(t('file.saveSuccess'));
      return { success: true, path: normalizedPath };
    } catch (error) {
      const message = `${t('file.saveFailed')}: ${error instanceof Error ? error.message : t('common.unknownError')}`;
      notifyError(message);
      return { success: false, error: error instanceof Error ? error.message : t('common.unknownError') };
    }
  };

  const canLeaveCurrentFile = (): Promise<boolean> => confirmProceedWhenUnsaved(saveMarkdown);

  const newFile = async (): Promise<void> => {
    if (!(await canLeaveCurrentFile())) return;
    setMarkdown('');
    // 切换到新文件后清空 undo/redo，避免撤销回上一个文件的内容
    clearUndoRedo();
    fileStore.startUntitledDraft();
    setUnsavedChanges(true);
    await updateTitle(null, true);
  };

  const openFile = async (): Promise<FileOperationResult> => {
    if (isLoading.value) return { success: false, error: t('unsavedDialog.cancelled') };
    if (!(await canLeaveCurrentFile())) {
      return { success: false, error: t('unsavedDialog.cancelled') };
    }

    isLoading.value = true;
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'markdown',
            extensions: SUPPORTED_FILE_EXTENSIONS,
          },
        ],
      });

      if (path === null) {
        return { success: false, error: t('file.userCancelledSelect') };
      }

      const normalizedPath = normalizePath(path);
      const markdown = await readTextFile(normalizedPath);
      guardLargeFileForMilkdown(markdown);
      setMarkdown(markdown);
      // 切换文件后清空 undo/redo，避免撤销回上一个文件的内容
      clearUndoRedo();
      fileStore.clearUntitledDraft();
      fileStore.setCurrentFilePath(normalizedPath);
      fileStore.addRecentFile(normalizedPath);
      await markClean(normalizedPath);

      return { success: true, path: normalizedPath };
    } catch (error) {
      const message = `${t('file.openFailed')}: ${error instanceof Error ? error.message : t('common.unknownError')}`;
      notifyError(message);
      return { success: false, error: error instanceof Error ? error.message : t('common.unknownError') };
    } finally {
      isLoading.value = false;
    }
  };

  const openFilePath = async (filePath: string): Promise<FileOperationResult> => {
    if (isLoading.value) return { success: false, error: t('unsavedDialog.cancelled') };
    if (!(await canLeaveCurrentFile())) {
      return { success: false, error: t('unsavedDialog.cancelled') };
    }

    isLoading.value = true;
    try {
      const normalizedPath = normalizePath(filePath);
      const markdown = await readTextFile(normalizedPath);
      guardLargeFileForMilkdown(markdown);
      setMarkdown(markdown);
      // 切换文件后清空 undo/redo，避免撤销回上一个文件的内容
      clearUndoRedo();
      fileStore.clearUntitledDraft();
      fileStore.setCurrentFilePath(normalizedPath);
      fileStore.addRecentFile(normalizedPath);
      await markClean(normalizedPath);

      return { success: true, path: normalizedPath };
    } catch (error) {
      const message = `${t('file.openFailed')}: ${error instanceof Error ? error.message : t('common.unknownError')}`;
      notifyError(message);
      return { success: false, error: error instanceof Error ? error.message : t('common.unknownError') };
    } finally {
      isLoading.value = false;
    }
  };

  const tryLoadLaunchFile = async (): Promise<boolean> => {
    try {
      const rawPath = await invoke<string | null>('get_launch_file_path');
      if (!rawPath) return false;

      const result = await openFilePath(rawPath);
      return result.success;
    } catch (error) {
      console.warn('加载启动文件失败:', error);
      return false;
    }
  };

  const restoreLastOpenedFile = async (): Promise<void> => {
    if (!fileStore.currentFilePath) return;

    try {
      const normalizedPath = normalizePath(fileStore.currentFilePath);
      const markdown = await readTextFile(normalizedPath);
      guardLargeFileForMilkdown(markdown);
      setMarkdown(markdown);
      // 启动恢复上次打开的文件后清空 undo/redo，避免出现无意义的历史栈
      clearUndoRedo();
      if (normalizedPath !== fileStore.currentFilePath) {
        fileStore.setCurrentFilePath(normalizedPath);
      }
      await markClean(normalizedPath);
    } catch (error) {
      console.warn('恢复上次打开的文件失败:', error);
      fileStore.removeRecentFile(fileStore.currentFilePath);
      fileStore.setCurrentFilePath(null);
      await markClean(null);
    }
  };

  const handleOpenFileFromSidebar = async (event: OpenFileFromSidebarEvent): Promise<void> => {
    const { filePath, content } = event.detail;
    if (!(await canLeaveCurrentFile())) return;

    const normalizedPath = normalizePath(filePath);
    guardLargeFileForMilkdown(content);
    setMarkdown(content);
    // 侧边栏切换文件后清空 undo/redo，避免撤销回上一个文件的内容
    clearUndoRedo();
    scrollPreviewToTop();
    fileStore.clearUntitledDraft();
    fileStore.setCurrentFilePath(normalizedPath);
    await markClean(normalizedPath);
  };

  const handleSaveFromToolbar = async (): Promise<void> => {
    const result = await saveMarkdown();
    if (!result.success && result.error) {
      notifyError(`${t('file.saveFailed')}: ${result.error}`);
    }
  };

  const restoreInitialFile = async (): Promise<void> => {
    const loadedFromLaunch = await tryLoadLaunchFile();
    if (!loadedFromLaunch) {
      await restoreLastOpenedFile();
    }
  };

  return {
    newFile,
    openFile,
    openFilePath,
    saveMarkdown,
    saveAsNewMarkdown,
    handleOpenFileFromSidebar,
    handleSaveFromToolbar,
    restoreInitialFile,
  };
}
