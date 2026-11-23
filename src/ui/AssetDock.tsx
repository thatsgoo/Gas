import { useRef, useState } from 'react'
import {
  Bookmark,
  Box,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  FolderUp,
  Map,
  Pencil,
  Plus,
  Trash2,
  Trees,
  Upload,
  X,
} from 'lucide-react'
import { getLocalizedAssetShort } from '../i18n/assetNames'
import { getUiStrings } from '../i18n/translations'
import { extractExternalThreeHtml, tryParseNativeSketchpadHtml } from '../importer/htmlImporter'
import { importExternalModelFile } from '../importer/modelImporter'
import { ASSET_CATALOG } from '../procedural/assetCatalog'
import { isDesktopApp, openSavedModelsFolder } from '../storage/savedModelsStorage'
import { useSceneStore } from '../store/useSceneStore'
import type { AssetCategory, AssetKind } from '../types/scene'

export function AssetDock() {
  const language = useSceneStore((s) => s.language)
  const cameraMode = useSceneStore((s) => s.cameraMode)
  const importedAssets = useSceneStore((s) => s.importedAssets)
  const savedLibrary = useSceneStore((s) => s.savedLibrary)
  const base = useSceneStore((s) => s.base)
  const addAsset = useSceneStore((s) => s.addAsset)
  const placeSavedModel = useSceneStore((s) => s.placeSavedModel)
  const renameSavedLibraryModel = useSceneStore((s) => s.renameSavedLibraryModel)
  const deleteSavedLibraryModel = useSceneStore((s) => s.deleteSavedLibraryModel)
  const registerImportedAsset = useSceneStore((s) => s.registerImportedAsset)
  const loadSerializedScene = useSceneStore((s) => s.loadSerializedScene)
  const setPendingHtmlExtraction = useSceneStore((s) => s.setPendingHtmlExtraction)
  const showToast = useSceneStore((s) => s.showToast)
  const ui = getUiStrings(language)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AssetCategory>('buildings')
  const [importing, setImporting] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (cameraMode === 'walk') return null

  const tabs: Array<{ id: AssetCategory; label: string; icon: React.ReactNode }> = [
    { id: 'buildings', label: ui.tabBuildings, icon: <Building2 className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'streets', label: ui.tabStreets, icon: <Map className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'landscape', label: ui.tabLandscape, icon: <Trees className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'library', label: ui.tabLibrary, icon: <Bookmark className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'imported', label: ui.tabImported, icon: <FolderUp className="w-3.5 h-3.5 shrink-0" /> },
  ]

  const items = ASSET_CATALOG.filter((a) => a.category === tab)

  const handleQuickPlace = (kind: AssetKind, importedAssetId?: string) => {
    const jitter = () => Math.round((Math.random() - 0.5) * 8)
    addAsset(
      kind,
      [(base.offsetX ?? 0) + jitter(), 0, (base.offsetZ ?? 0) + jitter()],
      importedAssetId,
    )
  }

  const handleQuickPlaceSaved = (savedId: string) => {
    const jitter = () => Math.round((Math.random() - 0.5) * 6)
    placeSavedModel(savedId, [(base.offsetX ?? 0) + jitter(), 0, (base.offsetZ ?? 0) + jitter()])
  }

  const handleDragStart = (
    e: React.DragEvent,
    kind: AssetKind,
    importedAssetId?: string,
    savedLibraryId?: string,
  ) => {
    e.dataTransfer.setData(
      'application/x-sketchpad-asset',
      JSON.stringify({ kind, importedAssetId, savedLibraryId }),
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    setImporting(true)
    try {
      if (ext === 'html' || ext === 'htm') {
        const text = await file.text()
        const native = tryParseNativeSketchpadHtml(text)
        if (native) {
          loadSerializedScene(native)
          showToast(ui.toastRestoredNative(file.name))
          return
        }
        showToast(ui.toastParsingHtml(file.name))
        const extraction = await extractExternalThreeHtml(text, file.name)
        setPendingHtmlExtraction(extraction)
        return
      }
      const { asset } = await importExternalModelFile(file)
      registerImportedAsset(asset)
      addAsset('imported', [base.offsetX ?? 0, 0, base.offsetZ ?? 0], asset.id)
      showToast(ui.toastImportedHtmlCount(1))
      setTab('imported')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 pointer-events-none max-w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,.fbx,.html,.htm"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Expandable Asset Drawer */}
      {open && (
        <div className="hud-surface pointer-events-auto w-[min(700px,calc(100vw-24px))] p-3 rounded-2xl flex flex-col gap-3">
          {/* Drawer Header: Category Tabs + Direct Import Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-wrap" role="tablist">
              {tabs.map((t) => {
                const active = t.id === tab
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors cursor-pointer"
                    style={{
                      background: active ? 'var(--hud-pill-active-bg)' : 'transparent',
                      color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                      border: active
                        ? '1px solid var(--hud-pill-active-border)'
                        : '1px solid transparent',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {t.id === 'library' && savedLibrary.length > 0 && (
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold leading-tight"
                        style={{
                          background: active ? 'var(--hud-action-bg)' : 'var(--hud-bg-subtle)',
                          color: active ? 'var(--hud-action-text)' : 'var(--hud-text-muted)',
                        }}
                      >
                        {savedLibrary.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {tab === 'library' && isDesktopApp() && (
                <button
                  type="button"
                  onClick={() => void openSavedModelsFolder()}
                  title="saved-models"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                  style={{
                    background: 'var(--hud-bg-subtle)',
                    color: 'var(--hud-text-secondary)',
                    border: '1px solid var(--hud-border)',
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{ui.openFolder}</span>
                </button>
              )}

              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? ui.importing : ui.import3dModel}</span>
              </button>
            </div>
          </div>

          {/* Drawer Grid */}
          {tab === 'library' ? (
            savedLibrary.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl text-center"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  border: '1px dashed var(--hud-border)',
                }}
              >
                <Bookmark className="w-5 h-5" style={{ color: 'var(--hud-text-muted)' }} />
                <div className="text-xs font-semibold" style={{ color: 'var(--hud-text)' }}>
                  {ui.libraryEmptyTitle}
                </div>
                <p className="text-xs m-0 max-w-md leading-relaxed" style={{ color: 'var(--hud-text-muted)' }}>
                  {ui.libraryEmptyDesc}
                </p>
              </div>
            ) : (
              <div className="studio-scroll flex items-center gap-2 overflow-x-auto pb-1">
                {savedLibrary.map((item) => {
                  const isRenaming = renamingId === item.id
                  return (
                    <div
                      key={item.id}
                      draggable={!isRenaming}
                      onDragStart={(e) => handleDragStart(e, 'imported', undefined, item.id)}
                      className="group shrink-0 w-38 p-2.5 rounded-xl text-left flex flex-col gap-1.5 transition-colors hover:bg-[var(--hud-bg-hover)]"
                      style={{
                        background: 'var(--hud-bg-subtle)',
                        border: '1px solid var(--hud-border)',
                      }}
                    >
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                void renameSavedLibraryModel(item.id, renameDraft)
                                setRenamingId(null)
                              } else if (e.key === 'Escape') {
                                setRenamingId(null)
                              }
                            }}
                            className="hud-input flex-1 min-w-0 px-1.5 py-0.5 rounded text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void renameSavedLibraryModel(item.id, renameDraft)
                              setRenamingId(null)
                            }}
                            className="p-0.5 rounded cursor-pointer"
                            style={{ color: 'var(--hud-action-bg)' }}
                            title={ui.done}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            className="p-0.5 rounded cursor-pointer"
                            style={{ color: 'var(--hud-text-muted)' }}
                            title={ui.cancel}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickPlaceSaved(item.id)}
                            title={item.name}
                            className="flex items-center gap-1.5 text-xs font-semibold truncate flex-1 text-left cursor-grab active:cursor-grabbing"
                            style={{ color: 'var(--hud-text)' }}
                          >
                            <Bookmark className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hud-action-bg)' }} />
                            <span className="truncate">{item.name}</span>
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(item.id)
                                setRenameDraft(item.name)
                              }}
                              title={ui.renameTitle}
                              className="p-0.5 rounded cursor-pointer hover:bg-[var(--hud-bg-solid)]"
                              style={{ color: 'var(--hud-text-muted)' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSavedLibraryModel(item.id)}
                              title={ui.deleteFromLibTitle}
                              className="p-0.5 rounded cursor-pointer hover:text-[var(--hud-danger-text)]"
                              style={{ color: 'var(--hud-text-muted)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => !isRenaming && handleQuickPlaceSaved(item.id)}
                        className="flex items-center justify-between text-[11px] text-left cursor-pointer"
                        style={{ color: 'var(--hud-text-muted)' }}
                      >
                        <span>{item.naturalSize.map((v) => v.toFixed(1)).join('×')}m</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px]"
                          style={{ background: 'var(--hud-bg-solid)', color: 'var(--hud-text-secondary)' }}
                        >
                          {item.defaultCelMode === 'white' ? ui.celWhite : ui.celColored}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          ) : tab === 'imported' ? (
            importedAssets.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl text-center"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  border: '1px dashed var(--hud-border)',
                }}
              >
                <FolderUp className="w-5 h-5" style={{ color: 'var(--hud-text-muted)' }} />
                <div className="text-xs font-semibold" style={{ color: 'var(--hud-text)' }}>
                  {ui.importedEmptyTitle}
                </div>
                <p className="text-xs m-0 max-w-sm" style={{ color: 'var(--hud-text-muted)' }}>
                  {ui.importedEmptyDesc}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background: 'var(--hud-pill-active-bg)',
                    color: 'var(--hud-pill-active-text)',
                    border: '1px solid var(--hud-pill-active-border)',
                  }}
                >
                  {ui.chooseModelFile}
                </button>
              </div>
            ) : (
              <div className="studio-scroll flex items-center gap-2 overflow-x-auto pb-1">
                {importedAssets.map((imp) => (
                  <button
                    key={imp.id}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'imported', imp.id)}
                    onClick={() => handleQuickPlace('imported', imp.id)}
                    title={imp.name}
                    className="shrink-0 w-32 p-2.5 rounded-xl text-left flex flex-col gap-1 transition-colors cursor-grab active:cursor-grabbing hover:bg-[var(--hud-bg-hover)]"
                    style={{
                      background: 'var(--hud-bg-subtle)',
                      border: '1px solid var(--hud-border)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                      <Box className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hud-action-bg)' }} />
                      <span className="truncate">{imp.name}</span>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--hud-text-muted)' }}>
                      {imp.naturalSize.map((v) => v.toFixed(1)).join('×')}m · .{imp.originalFormat}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="studio-scroll grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-48 overflow-y-auto pr-0.5">
              {items.map((item) => {
                const shortName = getLocalizedAssetShort(item.kind, language)
                return (
                  <button
                    key={item.kind}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.kind)}
                    onClick={() => handleQuickPlace(item.kind)}
                    title={shortName}
                    className="p-2 rounded-xl flex flex-col items-start justify-between gap-1 text-left transition-colors cursor-grab active:cursor-grabbing hover:bg-[var(--hud-bg-hover)]"
                    style={{
                      background: 'var(--hud-bg-subtle)',
                      border: '1px solid var(--hud-border)',
                    }}
                  >
                    <span className="text-xs font-semibold leading-tight truncate max-w-full" style={{ color: 'var(--hud-text)' }}>
                      {shortName}
                    </span>
                    <span className="text-[11px] leading-none" style={{ color: 'var(--hud-text-muted)' }}>
                      {item.defaultSize[0]}×{item.defaultSize[1]}m
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Compact Zero-UI Bottom Trigger Capsule */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hud-surface pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-transform active:scale-98 cursor-pointer"
        style={{ color: 'var(--hud-text)' }}
      >
        <Plus className="w-3.5 h-3.5" style={{ color: 'var(--hud-action-bg)' }} />
        <span>{ui.assetDockBtn}</span>
        <span className="text-[11px] hidden sm:inline" style={{ color: 'var(--hud-text-muted)', fontWeight: 500 }}>
          {ui.assetDockHint}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--hud-text-muted)' }} />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--hud-text-muted)' }} />
        )}
      </button>
    </div>
  )
}
