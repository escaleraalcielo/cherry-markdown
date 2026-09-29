/**
 * 简体中文文案表
 *
 * 约定：
 * - 这里只放「用户可见」的文案，代码注释保持中文但不进入文案表。
 * - en_US.ts 必须与本文件的键结构完全一致（由单测强制校验）。
 * - 需要拼接变量时使用 {name} 占位符，由 t() 在运行时替换。
 */

/** 翻译树：叶子为字符串，其余为嵌套分组 */
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

const zhCN: TranslationTree = {
  common: {
    save: '保存',
    cancel: '取消',
    close: '关闭',
    delete: '删除',
    add: '添加',
    clear: '清空',
    loading: '加载中...',
    unsaved: '未保存',
    saved: '已保存',
    draft: '临时文件',
    untitled: '未命名',
    unknownError: '未知错误',
  },

  file: {
    openFailed: '打开文件失败',
    saveSuccess: '文件已保存',
    saveFailed: '保存文件失败',
    saveAsSuccess: '文件已另存为',
    saveAsFailed: '另存为失败',
    readFailed: '读取文件失败',
    createFailed: '创建新文件失败',
    userCancelled: '用户取消操作',
    userCancelledSave: '用户取消保存',
    userCancelledSelect: '用户取消选择文件',
    restoreSuccess: '成功恢复上次打开的文件',
    restoreFailed: '恢复上次打开的文件失败',
    removeSuccess: '文件已从最近列表中移除',
    removeFailed: '移除文件失败',
    openExplorerFailed: '打开资源管理器失败',
    copyPathSuccess: '文件路径已复制到剪贴板',
    copyPathFailed: '复制文件路径失败',
    copyPathFallback: '无法打开，已复制文件路径到剪贴板',
    new: '新建文件',
    openFile: '打开文件',
    untitledName: '未命名.md',
    draftTooltip: '未保存的新建文件，保存后会写入磁盘',
    draftPath: '临时文档 - 保存后写入磁盘',
    defaultDocument: '# 新文档\n\n开始编写你的内容...',
  },

  directory: {
    openFailed: '打开目录失败',
    loadFailed: '加载目录结构失败',
    getListFailed: '获取目录列表失败',
    loadExpandStateFailed: '加载目录管理展开状态失败',
    saveExpandStateFailed: '保存目录管理展开状态失败',
  },

  shortcut: {
    registerSaveFailed: '注册保存快捷键失败',
    unregisterSaveFailed: '注销保存快捷键失败',
  },

  storage: {
    loadFileStateFailed: '加载文件状态失败',
    saveFileStateFailed: '保存文件状态失败',
  },

  unsavedDialog: {
    title: '未保存的更改',
    message: '检测到未保存的更改，您要如何处理？',
    saveAndContinue: '保存并继续',
    discard: '放弃更改',
    simpleConfirm: '检测到未保存的更改，继续操作将丢失未保存内容，是否继续？',
    cancelled: '已取消：存在未保存的更改',
  },

  statusBar: {
    untitledFile: '未命名',
    openContainingFolder: '在资源管理器中打开所在文件夹',
    lastChanged: '上次变更：{time}',
    focus: '专注',
    focusActive: '专注中',
    widthFixedTitle: '当前：固定宽度，点击切换为 100% 宽度',
    widthAutoTitle: '当前：100% 宽度，点击切换为固定宽度',
    fixedWidth: '固定宽度',
    fullWidth: '100% 宽度',
    viewMode: '视图模式',
    autoSnapshotTitle: '已自动快照，可点击「查看历史版本」进行查看',
    autoSnapshot: '自动快照 {time}',
    viewHistoryTitle: '查看当前文件的本地历史版本',
    viewHistory: '查看历史版本',
    charCount: '{count} 字',
    wordCount: '{count} 词',
    lineCount: '{count} 行',
    viewModeOptions: {
      editOnly: { label: '源码', title: '仅显示源码编辑区（Cherry · editOnly）' },
      editPreview: { label: '双栏', title: '源码与预览双栏（Cherry · edit&preview）' },
      previewOnly: { label: '预览', title: '仅显示预览（Cherry · previewOnly）' },
      wysiwyg: { label: 'WYSIWYG', title: '所见即所得编辑（Milkdown）' },
    },
  },

  settings: {
    title: '设置',
    language: '语言',
    languageDesc: '选择界面显示语言。修改后立即生效，无需重启。',
    focusMode: '专注模式',
    focusModeDesc: '专注模式下，正文采用居中固定宽度布局，便于阅读。可在下方自定义宽度，修改后立即生效。',
    fixedWidth: '固定宽度（px）',
    fixedWidthHint: '建议范围 {min} – {max}，默认 {default}。仅在“固定宽度”模式下生效，100% 宽度不受影响。',
    imageBed: '图床',
    imageBedDesc: '选择上传图片时使用的图床。修改后立即生效，无需重启。',
    picgoUrl: 'PicGo Server 上传地址',
    picgoUrlHint: '本地需先启动 PicGo 桌面客户端并在 "PicGo Server" 设置中打开监听。',
    uploadUrl: '上传 URL',
    formField: '表单字段名',
    formFieldHint: 'multipart/form-data 中承载文件的字段名，多数服务为 file / image。',
    responseUrlPath: '响应 URL 字段路径',
    responseUrlPathHint: '响应为 JSON 时，用点号路径提取最终图片 URL，例如 data.url、result.0.url。',
    customHeaders: '自定义请求头',
    headerNamePlaceholder: 'Header 名，如 Authorization',
    headerValuePlaceholder: 'Header 值',
    testConnection: '测试连接',
    testing: '测试中…',
    providers: {
      none: {
        label: '禁用（Base64 内联）',
        hint: '不使用图床，图片以 base64 内联到 markdown',
      },
      picgo: {
        label: 'PicGo Server',
        hint: '本地运行 PicGo，通过 HTTP 接口上传',
      },
      custom: {
        label: '自定义 HTTP 上传',
        hint: '任意支持 multipart/form-data 的上传接口',
      },
    },
  },

  versionHistory: {
    title: '本地历史版本',
    fileLabel: '文件：{path}',
    untitledDraft: '当前为未命名草稿的历史版本',
    loading: '正在加载…',
    empty: '暂无历史版本记录。',
    deleteVersion: '删除此版本',
    diff: '差异',
    original: '原文',
    diffTitle: '相对于磁盘上的当前文件内容',
    truncatedContent: '\n\n… (仅显示前 20KB)',
    truncatedDiff: '… 仅显示前 5000 行差异（共 {total} 行）',
    unreadableFile: '无法读取当前磁盘文件（按空内容对比）：{error}',
    clearAll: '清空所有版本',
    apply: '应用到编辑器',
    clearConfirmTitle: '清空本地历史版本',
    clearConfirmMessage: '确定要清空当前文件的全部 {count} 个本地历史版本吗？\n此操作不可撤销。',
  },

  exportAction: {
    exportedMarkdown: '已导出 Markdown：{path}',
    generatingHtml: '正在生成 HTML…',
    exportedHtml: '已导出 HTML：{path}',
    noPreviewForPrint: '未找到预览区域，无法打印',
    noPreviewForScreenshot: '未找到预览区域，无法截图',
    generatingLongImage: '正在生成长图，请稍候…',
    exportedLongImage: '已导出长图：{path}',
    generatingWord: '正在生成 Word 文档…',
    exportedWord: '已导出 Word：{path}',
    docxFallback: '生成 .docx 失败（{message}），已改为复制富文本到剪贴板，请在 Word 中按 Ctrl+V 粘贴',
    docxFailed: '生成 .docx 失败：{message}',
    instanceNotReady: 'Cherry 实例未就绪，无法导出',
    unknownType: '未知导出类型：{type}',
    failed: '导出失败：{message}',
    canvasToBlobEmpty: 'canvas.toBlob 返回空',
    fileReaderFailed: 'FileReader 读取失败',
    ctx2dFailed: '2d ctx 创建失败',
    ctxCreateFailed: '无法创建 2d 上下文',
    imgLoadFailed: '<img> 加载失败: {src}',
    asBlobUnknownType: 'asBlob 返回了无法识别的类型',
  },

  imageBed: {
    urlNotConfigured: '未配置上传 URL',
    uploadFailedHttp: '上传失败，HTTP {status}',
    fieldNotFound: '响应中未找到 "{path}" 字段',
    uploadingBatch: '<<正在上传 {count} 张图片…>>',
    uploading: '<<正在上传图片…>>',
    uploadFailedComment: '<!-- 图片上传失败 -->',
    uploadFailedCommentDetail: '<!-- 图片上传失败: {message} -->',
    picgoBadResponse: 'PicGo Server 返回格式异常',
    picgoHttp: 'PicGo Server 返回 {status}',
    testOk: '连通成功：{value}',
    testFailedHttp: '连接失败：HTTP {status}',
    testFailed: '连接失败：{message}',
    badResponse: '返回格式异常',
    enterUrl: '请填写上传 URL',
    urlUnreachable: 'URL 无法访问（可能是网络或 CORS 限制）',
    urlReachable: 'URL 可达（HTTP {status}），实际上传将在插入图片时进行',
  },

  recent: {
    today: '今天',
    yesterday: '昨天',
    drafts: '临时文件',
    empty: '暂无最近访问文件',
    fileCount: '{count} 个文件',
  },

  explorer: {
    noOpenFile: '当前没有打开的文件',
    fileNotInDirectory: '当前文件不在已打开目录中',
    noEditableFiles: '当前目录没有可编辑文件',
    selectDirectory: '请选择一个工作目录',
    openDirectory: '打开目录',
    noDirectorySelected: '未选择目录',
  },

  sidePanel: {
    explorer: '资源管理器',
    recent: '最近文件',
    refreshDirectory: '刷新目录',
    revealFile: '定位当前文件',
    activityBar: '侧边栏功能',
    expand: '展开侧边栏',
    collapse: '折叠侧边栏',
    currentVersion: '当前版本',
  },

  contextMenu: {
    removeFromList: '从列表中移除',
    copyPath: '复制文件路径',
    openInExplorer: '在资源管理器中打开',
  },

  editor: {
    menuEdit: '编辑',
    menuSave: '保存',
    menuExport: '导出',
    placeholder: '输入文本或「/」开始编辑',
    sizeThresholdWarning: '文件大小 {size}KB 超过 Milkdown 推荐阈值（{max}KB），已自动切换到 Cherry 引擎。',
    themes: {
      default: '明亮',
      dark: '暗黑',
      green: '清新',
      red: '热情',
      violet: '淡雅',
      blue: '清幽',
    },
  },

  milkdown: {
    noMatch: '未匹配到命令',
    h1: '一级标题',
    h2: '二级标题',
    h3: '三级标题',
    bulletList: '无序列表',
    orderedList: '有序列表',
    quote: '引用',
    codeBlock: '代码块',
    divider: '分割线',
    table: '表格',
    bold: '加粗 (Ctrl+B)',
    italic: '斜体 (Ctrl+I)',
    strikethrough: '删除线',
    inlineCode: '行内代码',
    link: '链接',
    linkPrompt: '输入链接地址',
    toParagraph: '转为段落',
    toQuote: '转为引用',
    copyParagraph: '复制段落',
    deleteParagraph: '删除段落',
    dragHandle: '拖动此处移动段落，或点击展开操作',
    notIntegratedTitle: 'Milkdown 引擎尚未接入',
    notIntegratedBody1: '这里将在完成',
    notIntegratedBody2: '并实现 milkdownAdapter.ts 后启用所见即所得编辑。',
    notIntegratedBody3: '切回 Cherry 引擎可继续正常编辑。',
  },

  app: {
    applyLocalVersion: '应用本地版本',
    fileSwitched: '当前文件已切换，忽略本次恢复',
    localVersionApplied: '已应用本地版本',
    historyVersionApplied: '已应用选中的历史版本',
    newLocalVersion: '发现更新的本地版本\n · 本地 {local}\n · 磁盘 {disk}',
  },
};

export default zhCN;
