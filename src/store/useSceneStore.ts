import { create } from 'zustand'
import type { ExternalHtmlExtraction } from '../importer/htmlImporter'
import { getUiStrings, loadSavedLanguage, persistLanguage } from '../i18n/translations'
import { getAssetDef } from '../procedural/assetCatalog'
import {
  deleteSavedModelFromStorage,
  listSavedModels,
  renameSavedModelInStorage,
  saveModelToLibrary,
} from '../storage/savedModelsStorage'
import type {
  AssetKind,
  BaseConfig,
  CameraBookmark,
  CameraMode,
  ImportedAsset,
  ImportedCelMode,
  LanguageCode,
  SavedLibraryModel,
  SceneObject,
  SerializedScene,
  TransformMode,
  WeatherPreset,
} from '../types/scene'

function uid(prefix = 'obj'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function createStarterObjects(): SceneObject[] {
  return [
    // Street backbone
    {
      id: 'st_cross_1',
      kind: 'road_cross',
      name: '十字路口',
      position: [-4, 0, 4],
      size: [12, 0.22, 12],
      rotationY: 0,
      uniformLock: true,
    },
    {
      id: 'st_road_n',
      kind: 'road_straight',
      name: '主街北段',
      position: [-4, 0, -14],
      size: [8, 0.22, 24],
      rotationY: 0,
      uniformLock: false,
    },
    {
      id: 'st_road_e',
      kind: 'road_straight',
      name: '横街东段',
      position: [13, 0, 4],
      size: [8, 0.22, 22],
      rotationY: Math.PI / 2,
      uniformLock: false,
    },
    // Waterfront canal touching the +Z base edge -> triggers translucent cel water cutaway!
    {
      id: 'st_water_1',
      kind: 'water',
      name: '滨水河道',
      position: [4, 0, 23],
      size: [28, 0.36, 14],
      rotationY: 0,
      uniformLock: false,
    },
    // Waterfront plaza
    {
      id: 'st_plaza_1',
      kind: 'plaza',
      name: '滨水广场',
      position: [-18, 0, 18],
      size: [14, 0.26, 14],
      rotationY: 0,
      uniformLock: false,
    },
    // Parametric Buildings
    {
      id: 'st_bld_flat',
      kind: 'flat_building',
      name: '现代平顶楼',
      position: [11, 0, -10],
      size: [11, 13, 9],
      rotationY: 0,
      uniformLock: false,
      litWindows: true,
    },
    {
      id: 'st_bld_arcade',
      kind: 'arcade_building',
      name: '架空连廊楼',
      position: [-16, 0, -9],
      size: [12, 10, 8],
      rotationY: Math.PI / 2,
      uniformLock: false,
      litWindows: true,
    },
    {
      id: 'st_bld_gable',
      kind: 'gable_house',
      name: '坡顶小屋',
      position: [-19, 0, 15],
      size: [8.5, 7.5, 6.5],
      rotationY: 0,
      uniformLock: false,
      litWindows: true,
    },
    {
      id: 'st_arch_1',
      kind: 'arch_block',
      name: '视线通廊拱门',
      position: [10, 0, 12],
      size: [7, 5.8, 2.6],
      rotationY: 0,
      uniformLock: false,
    },
    // Trees & Landscape
    {
      id: 'st_tree_1',
      kind: 'round_tree',
      name: '球形行道树',
      position: [3, 0, -4],
      size: [3.8, 5.6, 3.8],
      rotationY: 0.4,
      uniformLock: true,
    },
    {
      id: 'st_tree_2',
      kind: 'round_tree',
      name: '球形行道树',
      position: [3, 0, -13],
      size: [3.4, 5.1, 3.4],
      rotationY: 1.5,
      uniformLock: true,
    },
    {
      id: 'st_pine_1',
      kind: 'pine_tree',
      name: '层叠松树',
      position: [19, 0, -14],
      size: [3.4, 6.8, 3.4],
      rotationY: 0.2,
      uniformLock: true,
    },
    {
      id: 'st_lamp_1',
      kind: 'street_lamp',
      name: '极简路灯',
      position: [2.5, 0, 11],
      size: [1.0, 4.6, 1.0],
      rotationY: -Math.PI / 2,
      uniformLock: true,
    },
    {
      id: 'st_lamp_2',
      kind: 'street_lamp',
      name: '极简路灯',
      position: [-10.5, 0, 11],
      size: [1.0, 4.6, 1.0],
      rotationY: Math.PI / 2,
      uniformLock: true,
    },
    {
      id: 'st_car_1',
      kind: 'car',
      name: '极简小车',
      position: [-2.2, 0.16, -9],
      size: [1.9, 1.5, 4.2],
      rotationY: 0,
      uniformLock: true,
    },
    {
      id: 'st_bench_1',
      kind: 'bench',
      name: '街角长椅',
      position: [-13, 0.26, 15.5],
      size: [2.0, 0.85, 0.75],
      rotationY: Math.PI / 2,
      uniformLock: true,
    },
    // 1.7m Scale Silhouettes
    {
      id: 'st_human_1',
      kind: 'human_figure',
      name: '尺度小人 (1.7m)',
      position: [-12.5, 0.26, 19],
      size: [0.6, 1.72, 0.5],
      rotationY: 0.4,
      uniformLock: true,
    },
    {
      id: 'st_human_2',
      kind: 'human_figure',
      name: '尺度小人 (1.7m)',
      position: [9.5, 0, 14.5],
      size: [0.6, 1.72, 0.5],
      rotationY: -0.3,
      uniformLock: true,
    },
  ]
}

const DEFAULT_BASE: BaseConfig = {
  width: 60,
  depth: 60,
  thickness: 3.2,
  showBase: true,
  baseMode: 'diorama',
  offsetX: 0,
  offsetZ: 0,
}

const DEFAULT_BOOKMARKS: CameraBookmark[] = [
  {
    id: 'bm_overview',
    name: '鸟瞰全貌',
    mode: 'orbit',
    position: [44, 34, 48],
    target: [0, 3, 2],
  },
]

interface HistorySnapshot {
  base: BaseConfig
  objects: SceneObject[]
}

export interface SceneState {
  language: LanguageCode
  weather: WeatherPreset
  sunAngle: number // degrees 0..360
  audioEnabled: boolean
  base: BaseConfig
  objects: SceneObject[]
  importedAssets: ImportedAsset[]
  savedLibrary: SavedLibraryModel[]
  libraryLoaded: boolean
  bookmarks: CameraBookmark[]
  selectedId: string | null
  selectedIds: string[]
  snapEnabled: boolean
  transformMode: TransformMode
  surfaceAttach: boolean
  editingBase: boolean
  cameraMode: CameraMode
  pendingCameraTarget: {
    mode: CameraMode
    position: [number, number, number]
    target: [number, number, number]
  } | null
  pendingHtmlExtraction: ExternalHtmlExtraction | null
  toastMessage: string | null

  // History
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  // Actions
  setLanguage: (lang: LanguageCode) => void
  setWeather: (w: WeatherPreset) => void
  setSunAngle: (deg: number) => void
  setAudioEnabled: (v: boolean) => void
  setSnapEnabled: (v: boolean) => void
  setTransformMode: (mode: TransformMode) => void
  setSurfaceAttach: (v: boolean) => void
  setEditingBase: (v: boolean) => void
  setCameraMode: (mode: CameraMode) => void
  flyCameraTo: (
    mode: CameraMode,
    position: [number, number, number],
    target: [number, number, number],
  ) => void
  clearPendingCamera: () => void

  setBase: (patch: Partial<BaseConfig>, recordHistory?: boolean) => void
  selectObject: (id: string | null) => void
  toggleSelectObject: (id: string) => void
  selectAll: () => void
  addAsset: (kind: AssetKind, position?: [number, number, number], importedAssetId?: string) => string
  updateObject: (id: string, patch: Partial<SceneObject>, recordHistory?: boolean) => void
  batchUpdateObjects: (
    ids: string[],
    updater: (obj: SceneObject) => Partial<SceneObject>,
    recordHistory?: boolean,
  ) => void
  commitSnapshot: () => void
  duplicateSelected: () => void
  deleteSelected: () => void
  toggleLockObjects: (ids: string[]) => void
  unlockAllObjects: () => void
  clearCanvas: () => void
  loadStarterScene: () => void

  registerImportedAsset: (asset: ImportedAsset) => void
  setImportedCelMode: (id: string, mode: ImportedCelMode) => void
  loadSavedLibrary: () => Promise<void>
  saveObjectToLibrary: (objId: string, customName: string, defaultCelMode: ImportedCelMode) => Promise<boolean>
  placeSavedModel: (libId: string, position?: [number, number, number]) => string | null
  renameSavedLibraryModel: (id: string, name: string) => Promise<void>
  deleteSavedLibraryModel: (id: string) => Promise<void>
  loadSerializedScene: (scene: SerializedScene) => void
  batchImportHtmlObjects: (params: {
    assets: ImportedAsset[]
    objects: SceneObject[]
    replaceCanvas: boolean
    hideDefaultBase?: boolean
    autoFitBase?: { width: number; depth: number; offsetX: number; offsetZ: number }
  }) => void

  addBookmark: (bm: Omit<CameraBookmark, 'id'>) => void
  removeBookmark: (id: string) => void

  setPendingHtmlExtraction: (ext: ExternalHtmlExtraction | null) => void
  undo: () => void
  redo: () => void
  showToast: (msg: string) => void
  exportSerializedScene: () => SerializedScene
}

function cloneSnapshot(base: BaseConfig, objects: SceneObject[]): HistorySnapshot {
  return {
    base: { ...base },
    objects: objects.map((o) => ({
      ...o,
      position: [...o.position] as [number, number, number],
      size: [...o.size] as [number, number, number],
      rotation: o.rotation ? ([...o.rotation] as [number, number, number]) : undefined,
    })),
  }
}

let toastTimer: number | null = null

export const useSceneStore = create<SceneState>((set, get) => ({
  language: loadSavedLanguage(),
  weather: 'afternoon',
  sunAngle: 42,
  audioEnabled: false,
  base: { ...DEFAULT_BASE },
  objects: createStarterObjects(),
  importedAssets: [],
  savedLibrary: [],
  libraryLoaded: false,
  bookmarks: DEFAULT_BOOKMARKS,
  selectedId: null,
  selectedIds: [],
  snapEnabled: true,
  transformMode: 'move',
  surfaceAttach: false,
  editingBase: false,
  cameraMode: 'orbit',
  pendingCameraTarget: null,
  pendingHtmlExtraction: null,
  toastMessage: null,
  past: [],
  future: [],

  setLanguage: (language) => {
    persistLanguage(language)
    set({ language })
  },
  setWeather: (weather) => set({ weather }),
  setSunAngle: (sunAngle) => set({ sunAngle }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setTransformMode: (transformMode) => set({ transformMode }),
  setSurfaceAttach: (surfaceAttach) => set({ surfaceAttach }),
  setEditingBase: (editingBase) =>
    set((s) => ({
      editingBase,
      selectedId: editingBase ? null : s.selectedId,
      selectedIds: editingBase ? [] : s.selectedIds,
    })),

  setCameraMode: (cameraMode) =>
    set({ cameraMode, selectedId: null, selectedIds: [], editingBase: false }),

  flyCameraTo: (mode, position, target) =>
    set({
      cameraMode: mode,
      selectedId: null,
      selectedIds: [],
      editingBase: false,
      pendingCameraTarget: { mode, position, target },
    }),

  clearPendingCamera: () => set({ pendingCameraTarget: null }),

  commitSnapshot: () => {
    const s = get()
    const snap = cloneSnapshot(s.base, s.objects)
    set({ past: [...s.past.slice(-39), snap], future: [] })
  },

  setBase: (patch, recordHistory = true) => {
    const s = get()
    const past = recordHistory
      ? [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
      : s.past
    set({
      base: { ...s.base, ...patch },
      past,
      future: recordHistory ? [] : s.future,
    })
  },

  selectObject: (selectedId) =>
    set((s) => ({
      selectedId,
      selectedIds: selectedId ? [selectedId] : [],
      editingBase: selectedId ? false : s.editingBase,
    })),

  toggleSelectObject: (id) =>
    set((s) => {
      const exists = s.selectedIds.includes(id)
      const nextIds = exists ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]
      const nextPrimary = nextIds.length > 0 ? nextIds[nextIds.length - 1] : null
      return {
        selectedId: nextPrimary,
        selectedIds: nextIds,
        editingBase: false,
      }
    }),

  selectAll: () => {
    const s = get()
    if (s.objects.length === 0) return
    const unlocked = s.objects.filter((o) => !o.locked)
    const lockedCount = s.objects.length - unlocked.length
    if (unlocked.length === 0) {
      s.showToast('画布上所有物体均已锁定，请先解锁再全选')
      return
    }
    const allIds = unlocked.map((o) => o.id)
    set({
      selectedId: allIds[allIds.length - 1],
      selectedIds: allIds,
      editingBase: false,
    })
    s.showToast(
      lockedCount > 0
        ? `已全选 ${allIds.length} 个物体（已跳过 ${lockedCount} 个锁定物体）`
        : `已全选 ${allIds.length} 个物体（可整体平移、升降、旋转、总体缩放或锁定）`,
    )
  },

  addAsset: (kind, position, importedAssetId) => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    const def = getAssetDef(kind)
    let size: [number, number, number] = [...def.defaultSize]
    let name = def.label

    if (kind === 'imported' && importedAssetId) {
      const imp = s.importedAssets.find((a) => a.id === importedAssetId)
      if (imp) {
        size = [...imp.naturalSize]
        name = imp.name
      }
    }

    const pos: [number, number, number] = position ?? [0, 0, 0]
    const id = uid(kind)
    const obj: SceneObject = {
      id,
      kind,
      name,
      position: pos,
      size,
      rotationY: 0,
      uniformLock: def.defaultUniformLock,
      litWindows: def.supportsLitWindows ? true : undefined,
      celMode: kind === 'imported' ? 'white' : undefined,
      importedAssetId,
    }

    set({
      objects: [...s.objects, obj],
      selectedId: id,
      selectedIds: [id],
      editingBase: false,
      past,
      future: [],
    })
    return id
  },

  updateObject: (id, patch, recordHistory = false) => {
    const s = get()
    const target = s.objects.find((o) => o.id === id)
    if (!target) return
    if (target.locked && patch.locked === undefined) return
    const past = recordHistory
      ? [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
      : s.past
    set({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      past,
      future: recordHistory ? [] : s.future,
    })
  },

  batchUpdateObjects: (ids, updater, recordHistory = false) => {
    const s = get()
    const idSet = new Set(ids)
    const past = recordHistory
      ? [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
      : s.past
    set({
      objects: s.objects.map((o) => {
        if (!idSet.has(o.id)) return o
        const patch = updater(o)
        if (o.locked && patch.locked === undefined) return o
        return { ...o, ...patch }
      }),
      past,
      future: recordHistory ? [] : s.future,
    })
  },

  duplicateSelected: () => {
    const s = get()
    const ids = s.selectedIds.length > 0 ? s.selectedIds : s.selectedId ? [s.selectedId] : []
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const sources = s.objects.filter((o) => idSet.has(o.id) && !o.locked)
    if (sources.length === 0) {
      s.showToast('物体已锁定，请先解锁再复制')
      return
    }
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    const copies: SceneObject[] = sources.map((src) => ({
      ...src,
      locked: false,
      id: uid(src.kind),
      position: [src.position[0] + 2, src.position[1], src.position[2] + 2],
      size: [...src.size] as [number, number, number],
      rotation: src.rotation ? ([...src.rotation] as [number, number, number]) : undefined,
    }))
    const newIds = copies.map((c) => c.id)
    set({
      objects: [...s.objects, ...copies],
      selectedId: newIds[newIds.length - 1],
      selectedIds: newIds,
      past,
      future: [],
    })
    s.showToast(copies.length === 1 ? `已复制「${sources[0].name}」` : `已复制 ${copies.length} 个物体`)
  },

  deleteSelected: () => {
    const s = get()
    const ids = s.selectedIds.length > 0 ? s.selectedIds : s.selectedId ? [s.selectedId] : []
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const targets = s.objects.filter((o) => idSet.has(o.id) && !o.locked)
    if (targets.length === 0) {
      s.showToast('物体已锁定，请先解锁后再移除')
      return
    }
    const delSet = new Set(targets.map((o) => o.id))
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      objects: s.objects.filter((o) => !delSet.has(o.id)),
      selectedId: null,
      selectedIds: [],
      past,
      future: [],
    })
    s.showToast(targets.length === 1 ? `已移除「${targets[0].name}」` : `已移除 ${targets.length} 个物体`)
  },

  toggleLockObjects: (ids) => {
    const s = get()
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const targets = s.objects.filter((o) => idSet.has(o.id))
    if (targets.length === 0) return
    const shouldLock = targets.some((o) => !o.locked)
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      objects: s.objects.map((o) => (idSet.has(o.id) ? { ...o, locked: shouldLock } : o)),
      // When batch-locking multiple objects, deselect so user doesn't stay stuck in a multi-select capsule
      selectedId: shouldLock && targets.length > 1 ? null : s.selectedId,
      selectedIds: shouldLock && targets.length > 1 ? [] : s.selectedIds,
      past,
      future: [],
    })
    if (targets.length === 1) {
      s.showToast(
        shouldLock
          ? `已锁定「${targets[0].name}」（按住 Alt+左键点击可再次选中解锁）`
          : `已解锁「${targets[0].name}」`,
      )
    } else {
      s.showToast(
        shouldLock
          ? `已锁定 ${targets.length} 个物体（点击顶部「已锁定」可随时管理解锁）`
          : `已解锁 ${targets.length} 个物体`,
      )
    }
  },

  unlockAllObjects: () => {
    const s = get()
    const lockedCount = s.objects.filter((o) => o.locked).length
    if (lockedCount === 0) return
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      objects: s.objects.map((o) => (o.locked ? { ...o, locked: false } : o)),
      past,
      future: [],
    })
    s.showToast(`已全部解锁 ${lockedCount} 个物体`)
  },

  clearCanvas: () => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      objects: [],
      selectedId: null,
      selectedIds: [],
      past,
      future: [],
    })
    s.showToast(getUiStrings(s.language).toastCleared)
  },

  loadStarterScene: () => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      base: { ...DEFAULT_BASE },
      objects: createStarterObjects(),
      selectedId: null,
      selectedIds: [],
      editingBase: false,
      past,
      future: [],
    })
    s.showToast(getUiStrings(s.language).toastStarterRestored)
  },

  registerImportedAsset: (asset) =>
    set((s) => ({
      importedAssets: [asset, ...s.importedAssets],
    })),

  setImportedCelMode: (id, celMode) => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    set({
      objects: s.objects.map((o) => (o.id === id ? { ...o, celMode } : o)),
      past,
      future: [],
    })
  },

  loadSavedLibrary: async () => {
    try {
      const list = await listSavedModels()
      set({ savedLibrary: list, libraryLoaded: true })
    } catch {
      set({ libraryLoaded: true })
    }
  },

  saveObjectToLibrary: async (objId, customName, defaultCelMode) => {
    const s = get()
    const obj = s.objects.find((o) => o.id === objId)
    if (!obj || obj.kind !== 'imported' || !obj.importedAssetId) {
      s.showToast('仅支持保存导入的 3D 模型或外部 HTML 拆出的资产')
      return false
    }
    const backing =
      s.importedAssets.find((a) => a.id === obj.importedAssetId) ??
      s.savedLibrary.find((a) => a.id === obj.importedAssetId)
    if (!backing) {
      s.showToast('找不到该模型的原始数据，无法保存')
      return false
    }
    const cleanName = customName.trim() || obj.name || backing.name
    const record: SavedLibraryModel = {
      id: uid('lib'),
      name: cleanName,
      originalFormat: backing.originalFormat,
      glbBase64: backing.glbBase64,
      naturalSize: [
        Number(obj.size[0].toFixed(2)),
        Number(obj.size[1].toFixed(2)),
        Number(obj.size[2].toFixed(2)),
      ],
      defaultCelMode,
      savedAt: Date.now(),
    }
    try {
      await saveModelToLibrary(record)
      set((state) => ({
        savedLibrary: [record, ...state.savedLibrary],
      }))
      s.showToast(`已永久保存到「收藏资产」库：${cleanName}`)
      return true
    } catch (err) {
      s.showToast(err instanceof Error ? err.message : '保存到资产库失败')
      return false
    }
  },

  placeSavedModel: (libId, position) => {
    const s = get()
    const model = s.savedLibrary.find((m) => m.id === libId)
    if (!model) return null
    const hasAsset = s.importedAssets.some((a) => a.id === model.id)
    const nextImportedAssets = hasAsset
      ? s.importedAssets
      : [
          {
            id: model.id,
            name: model.name,
            originalFormat: model.originalFormat,
            glbBase64: model.glbBase64,
            naturalSize: [...model.naturalSize] as [number, number, number],
          },
          ...s.importedAssets,
        ]
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    const newId = uid('obj')
    const pos: [number, number, number] = position ?? [s.base.offsetX ?? 0, 0, s.base.offsetZ ?? 0]
    const newObj: SceneObject = {
      id: newId,
      kind: 'imported',
      name: model.name,
      position: pos,
      size: [...model.naturalSize] as [number, number, number],
      rotationY: 0,
      rotation: [0, 0, 0],
      uniformLock: true,
      celMode: model.defaultCelMode,
      importedAssetId: model.id,
    }
    set({
      importedAssets: nextImportedAssets,
      objects: [...s.objects, newObj],
      selectedId: newId,
      selectedIds: [newId],
      editingBase: false,
      past,
      future: [],
    })
    s.showToast(`已摆放收藏资产「${model.name}」`)
    return newId
  },

  renameSavedLibraryModel: async (id, name) => {
    const clean = name.trim()
    if (!clean) return
    try {
      await renameSavedModelInStorage(id, clean)
      set((s) => ({
        savedLibrary: s.savedLibrary.map((m) => (m.id === id ? { ...m, name: clean } : m)),
      }))
      get().showToast(`已重命名为「${clean}」`)
    } catch (err) {
      get().showToast(err instanceof Error ? err.message : '重命名失败')
    }
  },

  deleteSavedLibraryModel: async (id) => {
    const target = get().savedLibrary.find((m) => m.id === id)
    try {
      await deleteSavedModelFromStorage(id)
      set((s) => ({
        savedLibrary: s.savedLibrary.filter((m) => m.id !== id),
      }))
      get().showToast(target ? `已从资产库移除「${target.name}」` : '已从资产库移除')
    } catch (err) {
      get().showToast(err instanceof Error ? err.message : '删除失败')
    }
  },

  loadSerializedScene: (scene) => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    const mergedImports = [...(scene.importedAssets ?? [])]
    const seen = new Set(mergedImports.map((a) => a.id))
    for (const prev of s.importedAssets) {
      if (!seen.has(prev.id)) mergedImports.push(prev)
    }
    set({
      weather: scene.weather ?? 'afternoon',
      sunAngle: typeof scene.sunAngle === 'number' ? scene.sunAngle : 42,
      base: {
        width: scene.base?.width ?? 60,
        depth: scene.base?.depth ?? 60,
        thickness: scene.base?.thickness ?? 3.2,
        showBase: scene.base?.showBase ?? true,
        baseMode: scene.base?.baseMode ?? (scene.base?.showBase === false ? 'horizon' : 'diorama'),
        offsetX: scene.base?.offsetX ?? 0,
        offsetZ: scene.base?.offsetZ ?? 0,
      },
      objects: (scene.objects ?? []).map((o) => ({
        ...o,
        position: [...o.position] as [number, number, number],
        size: [...o.size] as [number, number, number],
      })),
      importedAssets: mergedImports,
      bookmarks: scene.bookmarks?.length ? scene.bookmarks : s.bookmarks,
      selectedId: null,
      selectedIds: [],
      editingBase: false,
      past,
      future: [],
    })
  },

  batchImportHtmlObjects: ({ assets, objects, replaceCanvas, hideDefaultBase, autoFitBase }) => {
    const s = get()
    const past = [...s.past.slice(-39), cloneSnapshot(s.base, s.objects)]
    let nextBase = autoFitBase ? { ...s.base, ...autoFitBase } : { ...s.base }
    if (hideDefaultBase) {
      nextBase = { ...nextBase, showBase: false, baseMode: 'none' }
    }
    set({
      base: nextBase,
      importedAssets: [...assets, ...s.importedAssets],
      objects: replaceCanvas ? objects : [...s.objects, ...objects],
      selectedId: objects.length === 1 ? objects[0].id : null,
      selectedIds: objects.length === 1 ? [objects[0].id] : [],
      editingBase: false,
      past,
      future: [],
    })
  },

  addBookmark: (bm) =>
    set((s) => ({
      bookmarks: [...s.bookmarks.slice(0, 4), { ...bm, id: uid('bm') }],
    })),

  removeBookmark: (id) =>
    set((s) => ({
      bookmarks: s.bookmarks.filter((b) => b.id !== id),
    })),

  setPendingHtmlExtraction: (pendingHtmlExtraction) => set({ pendingHtmlExtraction }),

  undo: () => {
    const s = get()
    if (s.past.length === 0) return
    const prev = s.past[s.past.length - 1]
    const cur = cloneSnapshot(s.base, s.objects)
    set({
      base: prev.base,
      objects: prev.objects,
      selectedId: null,
      selectedIds: [],
      past: s.past.slice(0, -1),
      future: [cur, ...s.future.slice(0, 39)],
    })
    s.showToast(getUiStrings(s.language).toastUndo)
  },

  redo: () => {
    const s = get()
    if (s.future.length === 0) return
    const next = s.future[0]
    const cur = cloneSnapshot(s.base, s.objects)
    set({
      base: next.base,
      objects: next.objects,
      selectedId: null,
      selectedIds: [],
      past: [...s.past, cur],
      future: s.future.slice(1),
    })
    s.showToast(getUiStrings(s.language).toastRedo)
  },

  showToast: (msg) => {
    if (toastTimer !== null) window.clearTimeout(toastTimer)
    set({ toastMessage: msg })
    toastTimer = window.setTimeout(() => {
      set({ toastMessage: null })
      toastTimer = null
    }, 2400)
  },

  exportSerializedScene: () => {
    const s = get()
    const ui = getUiStrings(s.language)
    const usedIds = new Set(
      s.objects.map((o) => o.importedAssetId).filter((v): v is string => Boolean(v)),
    )
    return {
      version: 1,
      language: s.language,
      weather: s.weather,
      sunAngle: s.sunAngle,
      base: { ...s.base },
      objects: s.objects.map((o) => ({
        ...o,
        position: [...o.position] as [number, number, number],
        size: [...o.size] as [number, number, number],
      })),
      importedAssets: s.importedAssets.filter((a) => usedIds.has(a.id)),
      bookmarks: s.bookmarks
        .filter((b) => b.id !== 'bm_corridor')
        .map((b) => ({
          ...b,
          name: b.id === 'bm_overview' ? ui.overviewBookmark : b.name,
        })),
    }
  },
}))
