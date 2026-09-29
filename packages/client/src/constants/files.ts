import { t } from '../i18n';

export const SUPPORTED_FILE_EXTENSIONS = ['md', 'markdown', 'text', 'txt'];
export const MAX_RECENT_FILES = 50;
export const MAX_DIRECTORY_DEPTH = 8;
/**
 * 新建文档的初始内容。
 * 做成函数而不是常量：模块级常量会在 i18n 运行时灌入语言之前求值，
 * 永远只能拿到中文。
 */
export const getDefaultFileContent = (): string => t('file.defaultDocument');
/** @deprecated 兼容旧引用，请改用 getDefaultFileContent() */
export const DEFAULT_FILE_CONTENT = getDefaultFileContent();
