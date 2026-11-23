export type WeatherPreset = 'afternoon' | 'dawn' | 'dusk' | 'rain'

export type LanguageCode = 'zh-CN' | 'zh-TW' | 'en' | 'ja'

export type CameraMode = 'orbit' | 'walk'

export type TransformMode = 'move' | 'rotate' | 'scale'

export type BaseMode = 'diorama' | 'horizon' | 'none'

export type AssetCategory = 'streets' | 'buildings' | 'landscape' | 'library' | 'imported'

export type AssetKind =
  // Streets & Terrain
  | 'road_straight'
  | 'road_cross'
  | 'road_t'
  | 'road_corner'
  | 'plaza'
  | 'lawn'
  | 'water'
  | 'steps'
  // Parametric Buildings & Massing
  | 'flat_building'
  | 'gable_house'
  | 'arcade_building'
  | 'shop'
  | 'supermarket'
  | 'box_block'
  | 'cylinder_block'
  | 'wedge_block'
  | 'arch_block'
  // Landscape & Everyday Urban Props
  | 'round_tree'
  | 'pine_tree'
  | 'banyan_tree'
  | 'birch_tree'
  | 'bush'
  | 'street_lamp'
  | 'utility_pole'
  | 'electric_box'
  | 'trash_bin'
  | 'car'
  | 'bench'
  | 'wide_bench'
  | 'human_figure'
  // External Imported
  | 'imported'

export type ImportedCelMode = 'white' | 'colored'

export interface BaseConfig {
  width: number
  depth: number
  thickness: number
  showBase: boolean
  /** 'diorama' = sculpted slab, 'horizon' = seamless ground, 'none' = completely hidden (for HTML with own base) */
  baseMode?: BaseMode
  /** World X/Z center offset so pulling one side leaves the opposite side nailed in place */
  offsetX: number
  offsetZ: number
}

export function getBaseMode(base: BaseConfig): BaseMode {
  if (base.baseMode) return base.baseMode
  return base.showBase ? 'diorama' : 'horizon'
}

export interface SceneObject {
  id: string
  kind: AssetKind
  name: string
  /** Bottom-center world position in meters */
  position: [number, number, number]
  /** Bounding box dimensions [width X, height Y, depth Z] in meters */
  size: [number, number, number]
  /** Y-axis rotation in radians (kept for backwards compatibility) */
  rotationY: number
  /** Full 360° 3-axis Euler rotation [rx, ry, rz] in radians */
  rotation?: [number, number, number]
  /** Slicer-style XYZ uniform scale lock */
  uniformLock: boolean
  /** Prevents accidental move/rotate/scale/delete and click-select (Alt+Click to select & unlock) */
  locked?: boolean
  /** Parametric building glowing windows toggle */
  litWindows?: boolean
  /** Imported model shading style */
  celMode?: ImportedCelMode
  /** Reference to ImportedAsset.id */
  importedAssetId?: string
}

export interface ImportedAsset {
  id: string
  name: string
  originalFormat: string
  /** Base64-encoded binary GLB normalized to bottom-center Y=0 */
  glbBase64: string
  /** Natural dimensions [x, y, z] in meters after normalization */
  naturalSize: [number, number, number]
}

export interface SavedLibraryModel extends ImportedAsset {
  defaultCelMode: ImportedCelMode
  savedAt: number
}

export interface CameraBookmark {
  id: string
  name: string
  mode: CameraMode
  position: [number, number, number]
  target: [number, number, number]
}

export interface SerializedScene {
  version: 1
  language?: LanguageCode
  weather: WeatherPreset
  sunAngle: number
  base: BaseConfig
  objects: SceneObject[]
  importedAssets: ImportedAsset[]
  bookmarks: CameraBookmark[]
}

export function getObjectEuler(obj: SceneObject): [number, number, number] {
  if (obj.rotation && obj.rotation.length === 3) {
    return obj.rotation
  }
  return [0, obj.rotationY ?? 0, 0]
}
