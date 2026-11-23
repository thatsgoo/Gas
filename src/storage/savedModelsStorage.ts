import type { SavedLibraryModel } from '../types/scene'

export interface DesktopSavedModelsBridge {
  isDesktop: true
  listSavedModels: () => Promise<SavedLibraryModel[]>
  saveModel: (model: SavedLibraryModel) => Promise<void>
  renameModel: (id: string, name: string) => Promise<void>
  deleteModel: (id: string) => Promise<void>
  openSavedModelsFolder: () => Promise<void>
}

declare global {
  interface Window {
    sketchpadDesktop?: DesktopSavedModelsBridge
  }
}

const DB_NAME = 'atmosphere-sketchpad-library'
const DB_VERSION = 1
const STORE_NAME = 'saved-models'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('无法打开本地资产库数据库'))
  })
}

export function isDesktopApp(): boolean {
  return Boolean(window.sketchpadDesktop?.isDesktop)
}

export async function listSavedModels(): Promise<SavedLibraryModel[]> {
  if (window.sketchpadDesktop) {
    return window.sketchpadDesktop.listSavedModels()
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const list = (req.result as SavedLibraryModel[] | undefined) ?? []
      list.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
      resolve(list)
    }
    req.onerror = () => reject(req.error ?? new Error('读取资产库失败'))
  })
}

export async function saveModelToLibrary(model: SavedLibraryModel): Promise<void> {
  if (window.sketchpadDesktop) {
    await window.sketchpadDesktop.saveModel(model)
    return
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(model)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('保存资产失败'))
  })
}

export async function renameSavedModelInStorage(id: string, name: string): Promise<void> {
  if (window.sketchpadDesktop) {
    await window.sketchpadDesktop.renameModel(id, name)
    return
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const cur = getReq.result as SavedLibraryModel | undefined
      if (cur) {
        store.put({ ...cur, name })
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('重命名资产失败'))
  })
}

export async function deleteSavedModelFromStorage(id: string): Promise<void> {
  if (window.sketchpadDesktop) {
    await window.sketchpadDesktop.deleteModel(id)
    return
  }
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('删除资产失败'))
  })
}

export async function openSavedModelsFolder(): Promise<void> {
  if (window.sketchpadDesktop) {
    await window.sketchpadDesktop.openSavedModelsFolder()
  }
}
