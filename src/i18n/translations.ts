import type { LanguageCode, WeatherPreset } from '../types/scene'

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string; short: string }> = [
  { code: 'zh-CN', label: '简体中文', short: '简' },
  { code: 'zh-TW', label: '繁體中文', short: '繁' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ja', label: '日本語', short: '日' },
]

const STORAGE_KEY = 'gas-language'

export function loadSavedLanguage(): LanguageCode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'zh-CN' || raw === 'zh-TW' || raw === 'en' || raw === 'ja') {
      return raw
    }
  } catch {
    // ignore
  }
  return 'zh-CN'
}

export function persistLanguage(lang: LanguageCode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

export const WEATHER_I18N: Record<LanguageCode, Record<WeatherPreset, { short: string; full: string }>> = {
  'zh-CN': {
    afternoon: { short: '午后', full: '明朗午后' },
    dawn: { short: '清晨', full: '薄雾清晨' },
    dusk: { short: '黄昏', full: '柔和黄昏' },
    rain: { short: '雨夜', full: '清冷雨夜' },
  },
  'zh-TW': {
    afternoon: { short: '午後', full: '明朗午後' },
    dawn: { short: '清晨', full: '薄霧清晨' },
    dusk: { short: '黃昏', full: '柔和黃昏' },
    rain: { short: '雨夜', full: '清冷雨夜' },
  },
  en: {
    afternoon: { short: 'Noon', full: 'Clear Afternoon' },
    dawn: { short: 'Dawn', full: 'Misty Dawn' },
    dusk: { short: 'Dusk', full: 'Soft Dusk' },
    rain: { short: 'Rain', full: 'Rainy Night' },
  },
  ja: {
    afternoon: { short: '昼', full: '晴天の午後' },
    dawn: { short: '朝', full: '薄霧の早朝' },
    dusk: { short: '夕', full: '柔らかな夕暮れ' },
    rain: { short: '雨夜', full: '静かな雨夜' },
  },
}

export interface UiStrings {
  // TopBar
  sunAngleTitle: string
  audioOn: string
  audioOff: string
  audioToggleOn: string
  audioToggleOff: string
  snapOn: string
  snapOff: string
  snapTitle: string
  baseHidden: string
  baseTitle: string
  lockedCount: (n: number) => string
  lockedTitle: string
  walkMode: string
  orbitMode: string
  cameraToggleTitle: string
  bookmarksTitle: string
  undoTitle: string
  redoTitle: string
  importHtml: string
  parsingHtml: string
  importHtmlTitle: string
  exportBtn: string
  languageTitle: string
  // Base popover
  basePresetHeader: string
  preset30: string
  preset60: string
  preset200: string
  preset1000: string
  stretchBaseBtn: string
  editing: string
  enable: string
  baseDisplayLabel: string
  baseDiorama: string
  baseHorizon: string
  baseNone: string
  baseNoneHint: string
  starterScene: string
  clearBase: string
  // Locks popover
  locksHeader: (n: number) => string
  unlockAll: string
  unlock: string
  locksHint: string
  // Bookmarks popover
  bookmarksHeader: string
  saveCurrentCam: string
  overviewBookmark: string
  walkCamLabel: (n: number) => string
  orbitCamLabel: (n: number) => string
  // Export popover
  exportHtmlTitle: string
  exportHtmlDesc: string
  exportHtmlBtn: string
  exportPngTitle: string
  aspectCurrent: string
  transparentBg: string
  exportPngBtn: string
  // App / Walk / Hint
  walkBarText: string
  returnOrbitBtn: string
  shortcutHint: string
  // SelectionCapsule
  baseStretchingTitle: string
  widthX: string
  depthZ: string
  done: string
  selectedCount: (n: number) => string
  modeMove: string
  modeRotate: string
  modeScale: string
  groupScaleBtn: string
  apply: string
  groupScaleHint: string
  groupRotate90: string
  groupLand: string
  switchAllColor: string
  switchAllWhite: string
  batchLock: string
  batchDuplicate: string
  batchDelete: string
  lockedSuffix: string
  lockedBannerHint: string
  unlockWithKey: string
  saveToLib: string
  attachOn: string
  attachOff: string
  elevation: string
  landBtn: string
  resetRot: string
  xyzLock: string
  xyzFree: string
  litWindows: string
  celWhite: string
  celColored: string
  lockBtn: string
  // Save to library modal
  saveModalTitle: string
  assetNameLabel: string
  assetNamePlaceholder: string
  defaultStyleLabel: string
  styleColored: string
  styleWhite: string
  saveModalHint: string
  cancel: string
  saving: string
  confirmSaveToLib: string
  // AssetDock
  tabBuildings: string
  tabStreets: string
  tabLandscape: string
  tabLibrary: string
  tabImported: string
  openFolder: string
  import3dModel: string
  importing: string
  libraryEmptyTitle: string
  libraryEmptyDesc: string
  importedEmptyTitle: string
  importedEmptyDesc: string
  chooseModelFile: string
  assetDockBtn: string
  assetDockHint: string
  renameTitle: string
  deleteFromLibTitle: string
  // HtmlImportModal
  htmlModalTitle: string
  htmlModalSub: (file: string, count: number, envCount: number) => string
  splitGranularity: string
  splitDeep: (n: number) => string
  splitDeepDesc: string
  splitTop: (n: number) => string
  splitTopDesc: string
  splitMerge: string
  splitMergeDesc: string
  celFusion: string
  celColoredRec: string
  celColoredDesc: string
  celWhiteDesc: string
  hideDefaultBaseOpt: string
  hideDefaultBaseAuto: string
  hideDefaultBaseManual: string
  replaceCanvasOpt: string
  skipEnvOpt: string
  packingImport: string
  confirmImportCount: (n: number) => string
  // Standalone Viewer strings
  viewerWalk: string
  viewerReturnOrbit: string
  viewerAudioOn: string
  viewerAudioOff: string
  viewerSunLabel: string
  viewerHintWalk: string
  viewerHintOrbit: string
  viewerTitle: string
  // Common Toasts
  toastRestoredNative: (name: string) => string
  toastParsingHtml: (name: string) => string
  toastExportedHtml: (kb: number) => string
  toastExportedPng: (aspect: string) => string
  toastSavedBookmark: (label: string) => string
  toastImportedHtmlCount: (n: number) => string
  toastUndo: string
  toastRedo: string
  toastCleared: string
  toastStarterRestored: string
  toastReturnOrbit: string
  toastGroupScaled: (n: number, pct: number) => string
  toastInvalidPct: string
}

export const TRANSLATIONS: Record<LanguageCode, UiStrings> = {
  'zh-CN': {
    sunAngleTitle: '拨动太阳方位角',
    audioOn: '声景开',
    audioOff: '声景',
    audioToggleOn: '开启环境白噪音',
    audioToggleOff: '关闭环境白噪音',
    snapOn: '吸附:开',
    snapOff: '吸附:关',
    snapTitle: '自动吸附开关（网格、墙面贴边、自动堆叠、15°旋转）',
    baseHidden: '隐藏基底',
    baseTitle: '基底尺度与底座显示设置',
    lockedCount: (n) => `已锁定 ${n}`,
    lockedTitle: '查看并管理已锁定的物体（也可按住 Alt+左键点击解锁）',
    walkMode: '漫游',
    orbitMode: '鸟瞰',
    cameraToggleTitle: '鸟瞰视角 ⇄ 1.65m 人视点漫游',
    bookmarksTitle: '机位书签',
    undoTitle: '撤销 (Ctrl+Z)',
    redoTitle: '重做 (Ctrl+Y)',
    importHtml: '导入HTML',
    parsingHtml: '解析中...',
    importHtmlTitle: '导入本软件导出的 HTML 或 AI 生成的 Three.js HTML 场景',
    exportBtn: '导出',
    languageTitle: '切换界面语言',
    basePresetHeader: '基底尺度预设（最大 1km）',
    preset30: '30m 庭院',
    preset60: '60m 街区',
    preset200: '200m 片区',
    preset1000: '1km 城区',
    stretchBaseBtn: '自由拉伸基底四边',
    editing: '编辑中',
    enable: '开启',
    baseDisplayLabel: '默认空白基底显示',
    baseDiorama: '悬浮底座',
    baseHorizon: '地平线',
    baseNone: '隐藏基底',
    baseNoneHint: '导入自带底座的 HTML 模型时选「隐藏基底」可去掉默认空白底座。',
    starterScene: '示例街区',
    clearBase: '清空基底',
    locksHeader: (n) => `已锁定物体（${n}）`,
    unlockAll: '全部解锁',
    unlock: '解锁',
    locksHint: '提示：画布中按住 Alt + 左键点击已锁定物体也可快速选中并解锁。',
    bookmarksHeader: '机位书签（最多 5 个）',
    saveCurrentCam: '存当前',
    overviewBookmark: '鸟瞰全貌',
    walkCamLabel: (n) => `人视机位 ${n}`,
    orbitCamLabel: (n) => `鸟瞰机位 ${n}`,
    exportHtmlTitle: '可分享交互微缩模型（推荐）',
    exportHtmlDesc: '导出单个离线 .html 文件，内嵌赛璐璐渲染器、太阳滑块与全部模型，断网双击即可交互漫游。',
    exportHtmlBtn: '导出离线单文件 .html',
    exportPngTitle: '无 UI 高清展板图（2x PNG）',
    aspectCurrent: '当前',
    transparentBg: '透明背景（方便直接贴入 PPT / 展板）',
    exportPngBtn: '导出高清展板 PNG',
    walkBarText: '1.65m 人视点漫游 · WASD 移动 · 左键拖拽环顾',
    returnOrbitBtn: '返回鸟瞰 (ESC)',
    shortcutHint: 'W 移动 · E 旋转 · S 缩放 · L 锁定 · Shift 贴墙 · Alt 选锁定物',
    baseStretchingTitle: '基底四边自由拉伸中',
    widthX: '宽 X',
    depthZ: '深 Z',
    done: '完成',
    selectedCount: (n) => `已选 ${n} 个物体`,
    modeMove: '移动',
    modeRotate: '旋转',
    modeScale: '缩放',
    groupScaleBtn: '总体缩放',
    apply: '应用',
    groupScaleHint: '也可直接拖总外框 4 个金色顶角球',
    groupRotate90: '整体旋转 90°',
    groupLand: '整体落地',
    switchAllColor: '切为全原色',
    switchAllWhite: '切为全纯白',
    batchLock: '批量锁定',
    batchDuplicate: '批量复制',
    batchDelete: '批量删除',
    lockedSuffix: '已锁定',
    lockedBannerHint: '防误拖误删 · 按住 Shift 仍可将摆件挂到其表面',
    unlockWithKey: '解锁 (L)',
    saveToLib: '存到库',
    attachOn: '贴面挂靠:开',
    attachOff: '贴面挂靠:关',
    elevation: '离地',
    landBtn: '落地',
    resetRot: '归正',
    xyzLock: 'XYZ锁',
    xyzFree: 'XYZ自由',
    litWindows: '亮窗',
    celWhite: '纯白',
    celColored: '原色',
    lockBtn: '锁定',
    saveModalTitle: '保存资产到自带模型库',
    assetNameLabel: '资产名称',
    assetNamePlaceholder: '例如：日式自动贩卖机、街角路灯...',
    defaultStyleLabel: '再次拖入画布时的默认画风',
    styleColored: '原色赛璐璐',
    styleWhite: '纯白赛璐璐',
    saveModalHint: '保存后会永久出现在「乐高资产库 → 收藏资产」中（桌面版存放在 saved-models 文件夹内），以后编辑任何新 HTML 都能直接拖出来复用。',
    cancel: '取消',
    saving: '保存中...',
    confirmSaveToLib: '确认保存到库',
    tabBuildings: '房屋体块',
    tabStreets: '街道地形',
    tabLandscape: '景观尺度',
    tabLibrary: '收藏资产',
    tabImported: '本次导入',
    openFolder: '打开目录',
    import3dModel: '导入 3D 模型',
    importing: '导入中...',
    libraryEmptyTitle: '收藏资产库还是空的',
    libraryEmptyDesc: '导入外部 HTML 或 3D 模型后，点击选中任意单个物体，再点底部胶囊里的「存到库」，就能把喜欢的贩卖机、建筑、路灯等资产永久存到这里（saved-models），随时拖进任何新场景。',
    importedEmptyTitle: '尚未导入外部模型',
    importedEmptyDesc: '支持将 .glb / .obj / .fbx 模型或 AI 生成的 Three.js .html 直接拖入画布，自动拆解为可编辑赛璐璐物体。',
    chooseModelFile: '选择本地模型文件',
    assetDockBtn: '乐高资产库',
    assetDockHint: '拖拽摆放 · 拖入 .glb/.obj',
    renameTitle: '重命名',
    deleteFromLibTitle: '从资产库删除',
    htmlModalTitle: '导入外部 3D HTML 场景',
    htmlModalSub: (f, c, e) => `${f} · 深度拆解 ${c} 个独立物体${e > 0 ? `（已识出 ${e} 个天空/雨雾特效）` : ''}`,
    splitGranularity: '拆解粒度',
    splitDeep: (n) => `深度拆分 (${n})`,
    splitDeepDesc: '拆开街道设施、车辆与独立建筑',
    splitTop: (n) => `按大组 (${n})`,
    splitTopDesc: '保留原作者顶层分类组',
    splitMerge: '合并整体 (1)',
    splitMergeDesc: '合为一个完整底模摆放',
    celFusion: '赛璐璐画风融合',
    celColoredRec: '原色赛璐璐（推荐）',
    celColoredDesc: '保留原配色贴图 + 卡通色阶描边',
    celWhiteDesc: '统一转为暖白建筑白模',
    hideDefaultBaseOpt: '隐藏默认空白基底',
    hideDefaultBaseAuto: '（已检测到此 HTML 自带底座，推荐隐藏）',
    hideDefaultBaseManual: '（保留纯粹模型悬浮展示）',
    replaceCanvasOpt: '替换当前画布内容（取消勾选则追加到现有场景）',
    skipEnvOpt: '自动跳过天空盒、雨雾特效与超大背景地面（使用本沙盒大气）',
    packingImport: '正在打包导入...',
    confirmImportCount: (n) => `确认导入 (${n} 个物体)`,
    viewerWalk: '人视漫游',
    viewerReturnOrbit: '返回鸟瞰 (ESC)',
    viewerAudioOn: '声景:开',
    viewerAudioOff: '声景:关',
    viewerSunLabel: '太阳',
    viewerHintWalk: 'WASD 移动 · 拖拽环顾 · ESC 返回鸟瞰',
    viewerHintOrbit: '拖拽旋转 · 滚轮缩放 · 拨动太阳滑块实时改变光影',
    viewerTitle: 'Gas 交互微缩展示',
    toastRestoredNative: (n) => `已无损还原沙盒工程「${n}」`,
    toastParsingHtml: (n) => `正在沙箱中解析 Three.js HTML「${n}」...`,
    toastExportedHtml: (kb) => `已导出离线单文件 HTML（约 ${kb} KB，双击即可交互浏览）`,
    toastExportedPng: (a) => `已导出无 UI 高清展板图（${a}）`,
    toastSavedBookmark: (l) => `已收藏「${l}」`,
    toastImportedHtmlCount: (n) => `已导入 ${n} 个可编辑 3D 物体`,
    toastUndo: '已撤销',
    toastRedo: '已重做',
    toastCleared: '已清空画布，保留干净基底',
    toastStarterRestored: '已恢复示例街区',
    toastReturnOrbit: '已返回鸟瞰视角',
    toastGroupScaled: (n, pct) => `已将 ${n} 个物体整体等比缩放至 ${pct}%`,
    toastInvalidPct: '请输入 10% ~ 1000% 之间的缩放比例',
  },
  'zh-TW': {
    sunAngleTitle: '調整太陽方位角',
    audioOn: '聲景開',
    audioOff: '聲景',
    audioToggleOn: '開啟環境白噪音',
    audioToggleOff: '關閉環境白噪音',
    snapOn: '吸附:開',
    snapOff: '吸附:關',
    snapTitle: '自動吸附開關（網格、牆面貼邊、自動堆疊、15°旋轉）',
    baseHidden: '隱藏基底',
    baseTitle: '基底尺度與底座顯示設定',
    lockedCount: (n) => `已鎖定 ${n}`,
    lockedTitle: '檢視並管理已鎖定的物體（也可按住 Alt+左鍵點擊解鎖）',
    walkMode: '漫遊',
    orbitMode: '鳥瞰',
    cameraToggleTitle: '鳥瞰視角 ⇄ 1.65m 人視點漫遊',
    bookmarksTitle: '機位書籤',
    undoTitle: '復原 (Ctrl+Z)',
    redoTitle: '重做 (Ctrl+Y)',
    importHtml: '匯入HTML',
    parsingHtml: '解析中...',
    importHtmlTitle: '匯入本軟體匯出的 HTML 或 AI 生成的 Three.js HTML 場景',
    exportBtn: '匯出',
    languageTitle: '切換介面語言',
    basePresetHeader: '基底尺度預設（最大 1km）',
    preset30: '30m 庭院',
    preset60: '60m 街區',
    preset200: '200m 片區',
    preset1000: '1km 城區',
    stretchBaseBtn: '自由拉伸基底四邊',
    editing: '編輯中',
    enable: '開啟',
    baseDisplayLabel: '預設空白基底顯示',
    baseDiorama: '懸浮底座',
    baseHorizon: '地平線',
    baseNone: '隱藏基底',
    baseNoneHint: '匯入自帶底座的 HTML 模型時選「隱藏基底」可去掉預設空白底座。',
    starterScene: '範例街區',
    clearBase: '清空基底',
    locksHeader: (n) => `已鎖定物體（${n}）`,
    unlockAll: '全部解鎖',
    unlock: '解鎖',
    locksHint: '提示：畫布中按住 Alt + 左鍵點擊已鎖定物體也可快速選取並解鎖。',
    bookmarksHeader: '機位書籤（最多 5 個）',
    saveCurrentCam: '存目前',
    overviewBookmark: '鳥瞰全貌',
    walkCamLabel: (n) => `人視機位 ${n}`,
    orbitCamLabel: (n) => `鳥瞰機位 ${n}`,
    exportHtmlTitle: '可分享互動微縮模型（推薦）',
    exportHtmlDesc: '匯出單一離線 .html 檔案，內嵌賽璐璐渲染器、太陽滑桿與全部模型，斷網雙擊即可互動漫遊。',
    exportHtmlBtn: '匯出離線單檔 .html',
    exportPngTitle: '無 UI 高清展板圖（2x PNG）',
    aspectCurrent: '目前',
    transparentBg: '透明背景（方便直接貼入簡報 / 展板）',
    exportPngBtn: '匯出高清展板 PNG',
    walkBarText: '1.65m 人視點漫遊 · WASD 移動 · 左鍵拖曳環顧',
    returnOrbitBtn: '返回鳥瞰 (ESC)',
    shortcutHint: 'W 移動 · E 旋轉 · S 縮放 · L 鎖定 · Shift 貼牆 · Alt 選鎖定物',
    baseStretchingTitle: '基底四邊自由拉伸中',
    widthX: '寬 X',
    depthZ: '深 Z',
    done: '完成',
    selectedCount: (n) => `已選 ${n} 個物體`,
    modeMove: '移動',
    modeRotate: '旋轉',
    modeScale: '縮放',
    groupScaleBtn: '總體縮放',
    apply: '套用',
    groupScaleHint: '也可直接拖總外框 4 個金色頂角球',
    groupRotate90: '整體旋轉 90°',
    groupLand: '整體落地',
    switchAllColor: '切為全原色',
    switchAllWhite: '切為全純白',
    batchLock: '批次鎖定',
    batchDuplicate: '批次複製',
    batchDelete: '批次刪除',
    lockedSuffix: '已鎖定',
    lockedBannerHint: '防誤拖誤刪 · 按住 Shift 仍可將擺件掛到其表面',
    unlockWithKey: '解鎖 (L)',
    saveToLib: '存到庫',
    attachOn: '貼面掛靠:開',
    attachOff: '貼面掛靠:關',
    elevation: '離地',
    landBtn: '落地',
    resetRot: '歸正',
    xyzLock: 'XYZ鎖',
    xyzFree: 'XYZ自由',
    litWindows: '亮窗',
    celWhite: '純白',
    celColored: '原色',
    lockBtn: '鎖定',
    saveModalTitle: '儲存資產到內建模型庫',
    assetNameLabel: '資產名稱',
    assetNamePlaceholder: '例如：日式自動販賣機、街角路燈...',
    defaultStyleLabel: '再次拖入畫布時的預設畫風',
    styleColored: '原色賽璐璐',
    styleWhite: '純白賽璐璐',
    saveModalHint: '儲存後會永久出現在「樂高資產庫 → 收藏資產」中（桌面版存放在 saved-models 資料夾內），之後編輯任何新 HTML 都能直接拖出來複用。',
    cancel: '取消',
    saving: '儲存中...',
    confirmSaveToLib: '確認儲存到庫',
    tabBuildings: '房屋體塊',
    tabStreets: '街道地形',
    tabLandscape: '景觀尺度',
    tabLibrary: '收藏資產',
    tabImported: '本次匯入',
    openFolder: '開啟目錄',
    import3dModel: '匯入 3D 模型',
    importing: '匯入中...',
    libraryEmptyTitle: '收藏資產庫還是空的',
    libraryEmptyDesc: '匯入外部 HTML 或 3D 模型後，點擊選取任意單一物體，再點底部膠囊裡的「存到庫」，就能把喜歡的販賣機、建築、路燈等資產永久存到這裡（saved-models）。',
    importedEmptyTitle: '尚未匯入外部模型',
    importedEmptyDesc: '支援將 .glb / .obj / .fbx 模型或 AI 生成的 Three.js .html 直接拖入畫布，自動拆解為可編輯賽璐璐物體。',
    chooseModelFile: '選擇本機模型檔案',
    assetDockBtn: '樂高資產庫',
    assetDockHint: '拖曳擺放 · 拖入 .glb/.obj',
    renameTitle: '重新命名',
    deleteFromLibTitle: '從資產庫刪除',
    htmlModalTitle: '匯入外部 3D HTML 場景',
    htmlModalSub: (f, c, e) => `${f} · 深度拆解 ${c} 個獨立物體${e > 0 ? `（已辨識 ${e} 個天空/雨霧特效）` : ''}`,
    splitGranularity: '拆解粒度',
    splitDeep: (n) => `深度拆分 (${n})`,
    splitDeepDesc: '拆開街道設施、車輛與獨立建築',
    splitTop: (n) => `按大組 (${n})`,
    splitTopDesc: '保留原作者頂層分類組',
    splitMerge: '合併整體 (1)',
    splitMergeDesc: '合為一個完整底模擺放',
    celFusion: '賽璐璐畫風融合',
    celColoredRec: '原色賽璐璐（推薦）',
    celColoredDesc: '保留原配色貼圖 + 卡通色階描邊',
    celWhiteDesc: '統一轉為暖白建築白模',
    hideDefaultBaseOpt: '隱藏預設空白基底',
    hideDefaultBaseAuto: '（已偵測到此 HTML 自帶底座，推薦隱藏）',
    hideDefaultBaseManual: '（保留純粹模型懸浮展示）',
    replaceCanvasOpt: '取代目前畫布內容（取消勾選則追加到現有場景）',
    skipEnvOpt: '自動略過天空盒、雨霧特效與超大背景地面（使用本沙盒大氣）',
    packingImport: '正在打包匯入...',
    confirmImportCount: (n) => `確認匯入 (${n} 個物體)`,
    viewerWalk: '人視漫遊',
    viewerReturnOrbit: '返回鳥瞰 (ESC)',
    viewerAudioOn: '聲景:開',
    viewerAudioOff: '聲景:關',
    viewerSunLabel: '太陽',
    viewerHintWalk: 'WASD 移動 · 拖曳環顧 · ESC 返回鳥瞰',
    viewerHintOrbit: '拖曳旋轉 · 滾輪縮放 · 撥動太陽滑桿即時改變光影',
    viewerTitle: 'Gas 互動微縮展示',
    toastRestoredNative: (n) => `已無損還原沙盒專案「${n}」`,
    toastParsingHtml: (n) => `正在沙箱中解析 Three.js HTML「${n}」...`,
    toastExportedHtml: (kb) => `已匯出離線單檔 HTML（約 ${kb} KB，雙擊即可互動瀏覽）`,
    toastExportedPng: (a) => `已匯出無 UI 高清展板圖（${a}）`,
    toastSavedBookmark: (l) => `已收藏「${l}」`,
    toastImportedHtmlCount: (n) => `已匯入 ${n} 個可編輯 3D 物體`,
    toastUndo: '已復原',
    toastRedo: '已重做',
    toastCleared: '已清空畫布，保留乾淨基底',
    toastStarterRestored: '已恢復範例街區',
    toastReturnOrbit: '已返回鳥瞰視角',
    toastGroupScaled: (n, pct) => `已將 ${n} 個物體整體等比縮放至 ${pct}%`,
    toastInvalidPct: '請輸入 10% ~ 1000% 之間的縮放比例',
  },
  en: {
    sunAngleTitle: 'Adjust sun azimuth',
    audioOn: 'Sound On',
    audioOff: 'Sound',
    audioToggleOn: 'Enable ambient soundscape',
    audioToggleOff: 'Disable ambient soundscape',
    snapOn: 'Snap:On',
    snapOff: 'Snap:Off',
    snapTitle: 'Auto-snap (grid, walls, stacking, 15° rotation)',
    baseHidden: 'No Base',
    baseTitle: 'Base size & slab style',
    lockedCount: (n) => `Locked ${n}`,
    lockedTitle: 'Manage locked objects (or Alt+Click on canvas)',
    walkMode: 'Walk',
    orbitMode: 'Orbit',
    cameraToggleTitle: 'Orbit View ⇄ 1.65m First-Person Walk',
    bookmarksTitle: 'Camera Bookmarks',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Y)',
    importHtml: 'Import HTML',
    parsingHtml: 'Parsing...',
    importHtmlTitle: 'Import exported Gas HTML or AI-generated Three.js HTML scene',
    exportBtn: 'Export',
    languageTitle: 'Switch Language',
    basePresetHeader: 'Base Size Presets (up to 1km)',
    preset30: '30m Yard',
    preset60: '60m Block',
    preset200: '200m Zone',
    preset1000: '1km City',
    stretchBaseBtn: 'Stretch Base Edges',
    editing: 'Editing',
    enable: 'Enable',
    baseDisplayLabel: 'Default Blank Base',
    baseDiorama: 'Diorama',
    baseHorizon: 'Horizon',
    baseNone: 'Hidden',
    baseNoneHint: 'Choose "Hidden" when importing HTML scenes that already include their own base.',
    starterScene: 'Starter Scene',
    clearBase: 'Clear All',
    locksHeader: (n) => `Locked Objects (${n})`,
    unlockAll: 'Unlock All',
    unlock: 'Unlock',
    locksHint: 'Tip: Hold Alt + Left Click on any locked object in the viewport to select and unlock it.',
    bookmarksHeader: 'Camera Bookmarks (max 5)',
    saveCurrentCam: 'Save View',
    overviewBookmark: 'Overview',
    walkCamLabel: (n) => `Walk View ${n}`,
    orbitCamLabel: (n) => `Orbit View ${n}`,
    exportHtmlTitle: 'Interactive Offline HTML (Recommended)',
    exportHtmlDesc: 'Single offline .html with cel renderer, sun slider, and all assets. Double-click to explore anywhere.',
    exportHtmlBtn: 'Export Offline .html',
    exportPngTitle: 'Clean HD Board PNG (2x)',
    aspectCurrent: 'Current',
    transparentBg: 'Transparent background (for slides / boards)',
    exportPngBtn: 'Export HD PNG',
    walkBarText: '1.65m Walk Mode · WASD Move · Drag to Look',
    returnOrbitBtn: 'Orbit View (ESC)',
    shortcutHint: 'W Move · E Rotate · S Scale · L Lock · Shift Attach · Alt Pick Locked',
    baseStretchingTitle: 'Stretching Base Edges',
    widthX: 'W X',
    depthZ: 'D Z',
    done: 'Done',
    selectedCount: (n) => `${n} Selected`,
    modeMove: 'Move',
    modeRotate: 'Rotate',
    modeScale: 'Scale',
    groupScaleBtn: 'Group Scale',
    apply: 'Apply',
    groupScaleHint: 'Or drag the 4 gold top-corner spheres',
    groupRotate90: 'Rotate 90°',
    groupLand: 'Land Group',
    switchAllColor: 'All Color',
    switchAllWhite: 'All White',
    batchLock: 'Lock All',
    batchDuplicate: 'Duplicate',
    batchDelete: 'Delete',
    lockedSuffix: 'Locked',
    lockedBannerHint: 'Protected from edits · Hold Shift to attach props onto its surface',
    unlockWithKey: 'Unlock (L)',
    saveToLib: 'Save Asset',
    attachOn: 'Attach:On',
    attachOff: 'Attach:Off',
    elevation: 'Height',
    landBtn: 'Land',
    resetRot: 'Reset',
    xyzLock: 'XYZ Lock',
    xyzFree: 'XYZ Free',
    litWindows: 'Lights',
    celWhite: 'White',
    celColored: 'Color',
    lockBtn: 'Lock',
    saveModalTitle: 'Save Asset to Library',
    assetNameLabel: 'Asset Name',
    assetNamePlaceholder: 'e.g. Vending Machine, Street Lamp...',
    defaultStyleLabel: 'Default Style When Placed',
    styleColored: 'Colored Cel',
    styleWhite: 'White Cel',
    saveModalHint: 'Saved permanently in "Asset Library → Saved" (desktop stores files in saved-models/) for reuse in any future HTML scene.',
    cancel: 'Cancel',
    saving: 'Saving...',
    confirmSaveToLib: 'Save to Library',
    tabBuildings: 'Buildings',
    tabStreets: 'Streets',
    tabLandscape: 'Props',
    tabLibrary: 'Saved',
    tabImported: 'Imported',
    openFolder: 'Open Folder',
    import3dModel: 'Import 3D',
    importing: 'Importing...',
    libraryEmptyTitle: 'No saved assets yet',
    libraryEmptyDesc: 'Select any imported HTML or 3D object on canvas and click "Save Asset" to keep it permanently in saved-models/ for future scenes.',
    importedEmptyTitle: 'No external models imported',
    importedEmptyDesc: 'Drag .glb / .obj / .fbx or AI-generated Three.js .html directly onto the canvas.',
    chooseModelFile: 'Choose Model File',
    assetDockBtn: 'Asset Library',
    assetDockHint: 'Drag to place · Drop .glb/.obj',
    renameTitle: 'Rename',
    deleteFromLibTitle: 'Delete from library',
    htmlModalTitle: 'Import External 3D HTML Scene',
    htmlModalSub: (f, c, e) => `${f} · ${c} objects split${e > 0 ? ` (${e} sky/FX skipped)` : ''}`,
    splitGranularity: 'Split Granularity',
    splitDeep: (n) => `Deep (${n})`,
    splitDeepDesc: 'Separate props, vehicles & buildings',
    splitTop: (n) => `Groups (${n})`,
    splitTopDesc: 'Keep author top-level groups',
    splitMerge: 'Merged (1)',
    splitMergeDesc: 'Import as one single base model',
    celFusion: 'Cel Shading Style',
    celColoredRec: 'Colored Cel (Recommended)',
    celColoredDesc: 'Keep original colors/textures + ink outlines',
    celWhiteDesc: 'Unified warm-white architectural clay',
    hideDefaultBaseOpt: 'Hide default blank base',
    hideDefaultBaseAuto: ' (own base detected — recommended)',
    hideDefaultBaseManual: ' (float cleanly on sky)',
    replaceCanvasOpt: 'Replace current canvas (uncheck to append)',
    skipEnvOpt: 'Skip source skybox, mist FX & giant backdrop planes',
    packingImport: 'Packing & importing...',
    confirmImportCount: (n) => `Import (${n} objects)`,
    viewerWalk: 'Walk View',
    viewerReturnOrbit: 'Orbit View (ESC)',
    viewerAudioOn: 'Sound:On',
    viewerAudioOff: 'Sound:Off',
    viewerSunLabel: 'Sun',
    viewerHintWalk: 'WASD Move · Drag to Look · ESC Orbit View',
    viewerHintOrbit: 'Drag Orbit · Scroll Zoom · Slide Sun to adjust shadows',
    viewerTitle: 'Gas Interactive Miniature',
    toastRestoredNative: (n) => `Restored Gas project "${n}"`,
    toastParsingHtml: (n) => `Parsing Three.js HTML "${n}"...`,
    toastExportedHtml: (kb) => `Exported offline .html (~${kb} KB)`,
    toastExportedPng: (a) => `Exported HD PNG (${a})`,
    toastSavedBookmark: (l) => `Saved bookmark "${l}"`,
    toastImportedHtmlCount: (n) => `Imported ${n} editable 3D objects`,
    toastUndo: 'Undone',
    toastRedo: 'Redone',
    toastCleared: 'Canvas cleared',
    toastStarterRestored: 'Starter scene restored',
    toastReturnOrbit: 'Returned to Orbit View',
    toastGroupScaled: (n, pct) => `Scaled ${n} objects uniformly to ${pct}%`,
    toastInvalidPct: 'Enter a scale percentage between 10% and 1000%',
  },
  ja: {
    sunAngleTitle: '太陽の方位角を調整',
    audioOn: '環境音オン',
    audioOff: '環境音',
    audioToggleOn: '環境音をオンにする',
    audioToggleOff: '環境音をオフにする',
    snapOn: 'スナップ:入',
    snapOff: 'スナップ:切',
    snapTitle: '自動スナップ（グリッド・壁面・積み重ね・15°回転）',
    baseHidden: '土台なし',
    baseTitle: '土台サイズと表示設定',
    lockedCount: (n) => `ロック ${n}`,
    lockedTitle: 'ロック中のオブジェクトを管理（Alt+クリックでも選択可能）',
    walkMode: '散策',
    orbitMode: '俯瞰',
    cameraToggleTitle: '俯瞰視点 ⇄ 1.65m アイレベル散策',
    bookmarksTitle: 'カメラ登録',
    undoTitle: '元に戻す (Ctrl+Z)',
    redoTitle: 'やり直す (Ctrl+Y)',
    importHtml: 'HTML読込',
    parsingHtml: '解析中...',
    importHtmlTitle: '書き出した HTML や AI 生成 Three.js HTML シーンを読込',
    exportBtn: '書き出し',
    languageTitle: '表示言語を切り替え',
    basePresetHeader: '土台サイズプリセット（最大 1km）',
    preset30: '30m 中庭',
    preset60: '60m 街区',
    preset200: '200m 地区',
    preset1000: '1km 都市',
    stretchBaseBtn: '土台の四辺を伸縮',
    editing: '編集中',
    enable: '開始',
    baseDisplayLabel: 'デフォルト土台の表示',
    baseDiorama: 'ジオラマ台',
    baseHorizon: '地平線',
    baseNone: '非表示',
    baseNoneHint: '土台付きの HTML を読み込む場合は「非表示」がおすすめです。',
    starterScene: 'サンプル街区',
    clearBase: '全消去',
    locksHeader: (n) => `ロック中（${n}）`,
    unlockAll: 'すべて解除',
    unlock: '解除',
    locksHint: 'ヒント：Alt + 左クリックでロック中のオブジェクトを選択して解除できます。',
    bookmarksHeader: 'カメラ登録（最大 5 件）',
    saveCurrentCam: '現在を保存',
    overviewBookmark: '全体俯瞰',
    walkCamLabel: (n) => `アイレベル ${n}`,
    orbitCamLabel: (n) => `俯瞰視点 ${n}`,
    exportHtmlTitle: 'インタラクティブ単体 HTML（推奨）',
    exportHtmlDesc: 'オフライン動作する単一 .html を書き出します。太陽スライダーや全モデルを内蔵し、ダブルクリックで閲覧可能。',
    exportHtmlBtn: 'オフライン .html を書き出し',
    exportPngTitle: 'UI なし高解像度 PNG（2x）',
    aspectCurrent: '現在比',
    transparentBg: '背景を透過（スライド・ボード貼付用）',
    exportPngBtn: '高解像度 PNG を書き出し',
    walkBarText: '1.65m 散策モード · WASD 移動 · ドラッグで視点回転',
    returnOrbitBtn: '俯瞰に戻る (ESC)',
    shortcutHint: 'W 移動 · E 回転 · S 拡大縮小 · L ロック · Shift 壁面吸着 · Alt ロック選択',
    baseStretchingTitle: '土台の四辺を編集中',
    widthX: '幅 X',
    depthZ: '奥行 Z',
    done: '完了',
    selectedCount: (n) => `${n} 個を選択中`,
    modeMove: '移動',
    modeRotate: '回転',
    modeScale: '拡縮',
    groupScaleBtn: '一括拡縮',
    apply: '適用',
    groupScaleHint: '外枠の金色コーナー球ドラッグでも拡縮可能',
    groupRotate90: '一括 90°回転',
    groupLand: '一括接地',
    switchAllColor: '全てカラー',
    switchAllWhite: '全て白模型',
    batchLock: '一括ロック',
    batchDuplicate: '複製',
    batchDelete: '削除',
    lockedSuffix: 'ロック中',
    lockedBannerHint: '誤操作保護中 · Shift で表面に小物を吸着配置できます',
    unlockWithKey: '解除 (L)',
    saveToLib: 'ライブラリ保存',
    attachOn: '表面吸着:入',
    attachOff: '表面吸着:切',
    elevation: '高さ',
    landBtn: '接地',
    resetRot: 'リセット',
    xyzLock: '比率固定',
    xyzFree: '自由比率',
    litWindows: '窓明かり',
    celWhite: '白模型',
    celColored: 'カラー',
    lockBtn: 'ロック',
    saveModalTitle: '内蔵ライブラリに保存',
    assetNameLabel: 'アセット名',
    assetNamePlaceholder: '例：自販機、街灯、コンビニ看板...',
    defaultStyleLabel: '配置時のデフォルト表現',
    styleColored: 'カラー・セル調',
    styleWhite: 'ホワイト白模型',
    saveModalHint: '「アセット庫 → 保存済み」に永続保存され（デスクトップ版は saved-models フォルダに保存）、別シーンでも再利用できます。',
    cancel: 'キャンセル',
    saving: '保存中...',
    confirmSaveToLib: 'ライブラリに保存',
    tabBuildings: '建物',
    tabStreets: '道路・地形',
    tabLandscape: '添景・小物',
    tabLibrary: '保存済み',
    tabImported: '読込済み',
    openFolder: 'フォルダを開く',
    import3dModel: '3D 読込',
    importing: '読込中...',
    libraryEmptyTitle: '保存済みアセットはまだありません',
    libraryEmptyDesc: '外部 HTML や 3D モデルからオブジェクトを選択し「ライブラリ保存」を押すと saved-models に永続保存されます。',
    importedEmptyTitle: '外部モデルは未読込です',
    importedEmptyDesc: '.glb / .obj / .fbx または AI 生成の Three.js .html をドラッグ＆ドロップして編集できます。',
    chooseModelFile: 'モデルファイルを選択',
    assetDockBtn: 'アセット庫',
    assetDockHint: 'ドラッグ配置 · .glb/.obj 対応',
    renameTitle: '名前を変更',
    deleteFromLibTitle: 'ライブラリから削除',
    htmlModalTitle: '外部 3D HTML シーンを読み込み',
    htmlModalSub: (f, c, e) => `${f} · ${c} 個の独立オブジェクトに分解${e > 0 ? `（空/エフェクト ${e} 個を検出）` : ''}`,
    splitGranularity: '分解粒度',
    splitDeep: (n) => `詳細分解 (${n})`,
    splitDeepDesc: '小物・車両・建物を個別に分解',
    splitTop: (n) => `グループ別 (${n})`,
    splitTopDesc: '元ファイルの最上位グループを維持',
    splitMerge: '一体化 (1)',
    splitMergeDesc: '1 つのまとまったモデルとして配置',
    celFusion: 'セルシェーディング表現',
    celColoredRec: 'カラー・セル調（推奨）',
    celColoredDesc: '元の色・テクスチャを維持＋輪郭線',
    celWhiteDesc: '統一感のある建築白模型に変換',
    hideDefaultBaseOpt: 'デフォルト空白土台を隠す',
    hideDefaultBaseAuto: '（専用土台を検出・非表示を推奨）',
    hideDefaultBaseManual: '（モデル単体で浮かせて表示）',
    replaceCanvasOpt: '現在のキャンバスを置換（オフで追加配置）',
    skipEnvOpt: '元の空ボックス・霧エフェクト・巨大背景面を除外',
    packingImport: '取り込み中...',
    confirmImportCount: (n) => `読み込み確定 (${n} 個)`,
    viewerWalk: '散策モード',
    viewerReturnOrbit: '俯瞰に戻る (ESC)',
    viewerAudioOn: '環境音:入',
    viewerAudioOff: '環境音:切',
    viewerSunLabel: '太陽',
    viewerHintWalk: 'WASD 移動 · ドラッグ見回し · ESC で俯瞰へ',
    viewerHintOrbit: 'ドラッグ回転 · ホイール拡縮 · 太陽スライダーで影を調整',
    viewerTitle: 'Gas インタラクティブ模型',
    toastRestoredNative: (n) => `プロジェクト「${n}」を復元しました`,
    toastParsingHtml: (n) => `Three.js HTML「${n}」を解析中...`,
    toastExportedHtml: (kb) => `オフライン HTML を書き出しました（約 ${kb} KB）`,
    toastExportedPng: (a) => `高解像度 PNG を書き出しました（${a}）`,
    toastSavedBookmark: (l) => `カメラ「${l}」を登録しました`,
    toastImportedHtmlCount: (n) => `${n} 個の編集可能な 3D オブジェクトを読み込みました`,
    toastUndo: '元に戻しました',
    toastRedo: 'やり直しました',
    toastCleared: 'キャンバスをクリアしました',
    toastStarterRestored: 'サンプル街区を復元しました',
    toastReturnOrbit: '俯瞰視点に戻りました',
    toastGroupScaled: (n, pct) => `${n} 個を均等に ${pct}% へ拡縮しました`,
    toastInvalidPct: '10% 〜 1000% の範囲で入力してください',
  },
}

export function getUiStrings(lang: LanguageCode): UiStrings {
  return TRANSLATIONS[lang] ?? TRANSLATIONS['zh-CN']
}
