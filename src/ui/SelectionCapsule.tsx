/*
 * Refactoring UI Workflow B — Constraint Brief
 * --------------------------------------------
 * Contextual 3-Mode Selection Capsule (Move / Rotate / Scale):
 *   Group 1: Mutually exclusive mode switcher (移动 W / 旋转 E / 缩放 S) + Object name
 *   Group 2: Mode-specific controls ONLY (zero bloat):
 *     - move:   "📌 贴面挂靠" (Shift) + 离地高度 H + 落地
 *     - rotate: 360° RX / RY / RZ degree inputs + 90° + 归正
 *     - scale:  XYZ 锁定/自由 + X / Y / Z meter inputs
 *   Group 3: Style toggle (亮窗 / 纯白·原色赛璐璐) + quiet Copy / Delete
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownToLine,
  BookmarkPlus,
  Copy,
  Lamp,
  Lock,
  Maximize2,
  Move,
  Palette,
  Pin,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import { getUiStrings } from '../i18n/translations'
import { computeGroupBounds, computeGroupScaledPatch } from '../interaction/groupTransform'
import { getAssetDef } from '../procedural/assetCatalog'
import { useSceneStore } from '../store/useSceneStore'
import { getObjectEuler, type ImportedCelMode, type TransformMode } from '../types/scene'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

function normDeg(rad: number): number {
  let d = Math.round(rad * RAD_TO_DEG) % 360
  if (d < 0) d += 360
  return d
}

export function SelectionCapsule() {
  const language = useSceneStore((s) => s.language)
  const selectedId = useSceneStore((s) => s.selectedId)
  const selectedIds = useSceneStore((s) => s.selectedIds)
  const editingBase = useSceneStore((s) => s.editingBase)
  const base = useSceneStore((s) => s.base)
  const objects = useSceneStore((s) => s.objects)
  const cameraMode = useSceneStore((s) => s.cameraMode)
  const transformMode = useSceneStore((s) => s.transformMode)
  const surfaceAttach = useSceneStore((s) => s.surfaceAttach)

  const setTransformMode = useSceneStore((s) => s.setTransformMode)
  const setSurfaceAttach = useSceneStore((s) => s.setSurfaceAttach)
  const updateObject = useSceneStore((s) => s.updateObject)
  const batchUpdateObjects = useSceneStore((s) => s.batchUpdateObjects)
  const selectObject = useSceneStore((s) => s.selectObject)
  const setImportedCelMode = useSceneStore((s) => s.setImportedCelMode)
  const duplicateSelected = useSceneStore((s) => s.duplicateSelected)
  const deleteSelected = useSceneStore((s) => s.deleteSelected)
  const toggleLockObjects = useSceneStore((s) => s.toggleLockObjects)
  const setEditingBase = useSceneStore((s) => s.setEditingBase)
  const setBase = useSceneStore((s) => s.setBase)
  const saveObjectToLibrary = useSceneStore((s) => s.saveObjectToLibrary)
  const showToast = useSceneStore((s) => s.showToast)
  const ui = getUiStrings(language)

  const modeTabs: Array<{ id: TransformMode; label: string; keyHint: string; icon: React.ReactNode }> = [
    { id: 'move', label: ui.modeMove, keyHint: 'W', icon: <Move className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'rotate', label: ui.modeRotate, keyHint: 'E', icon: <RotateCw className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'scale', label: ui.modeScale, keyHint: 'S', icon: <Maximize2 className="w-3.5 h-3.5 shrink-0" /> },
  ]

  const [scalePercentInput, setScalePercentInput] = useState('100')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveCelMode, setSaveCelMode] = useState<ImportedCelMode>('colored')
  const [savingToLib, setSavingToLib] = useState(false)

  if (cameraMode === 'walk') return null

  // Base-stretching mini capsule
  if (editingBase) {
    return (
      <div className="pointer-events-auto max-w-full">
        <div className="hud-surface flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-3.5 py-2 rounded-2xl text-xs">
          <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--hud-snap-text)' }}>
            {ui.baseStretchingTitle}
          </span>
          <span className="hidden sm:block w-px h-4" style={{ background: 'var(--hud-border)' }} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--hud-text-secondary)' }}>
              <span>{ui.widthX}</span>
              <input
                type="number"
                min={16}
                max={1000}
                step={2}
                value={base.width}
                onChange={(e) => setBase({ width: Math.max(16, Math.min(1000, Number(e.target.value) || 60)) }, true)}
                className="hud-input w-16 px-1.5 py-1 rounded-md text-xs text-right"
              />
              <span>m</span>
            </label>
            <label className="flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--hud-text-secondary)' }}>
              <span>{ui.depthZ}</span>
              <input
                type="number"
                min={16}
                max={1000}
                step={2}
                value={base.depth}
                onChange={(e) => setBase({ depth: Math.max(16, Math.min(1000, Number(e.target.value) || 60)) }, true)}
                className="hud-input w-16 px-1.5 py-1 rounded-md text-xs text-right"
              />
              <span>m</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setEditingBase(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              background: 'var(--hud-pill-active-bg)',
              color: 'var(--hud-pill-active-text)',
            }}
          >
            <X className="w-3.5 h-3.5" />
            {ui.done}
          </button>
        </div>
      </div>
    )
  }

  // Multi-selection batch control capsule (Ctrl+Click / Ctrl+A)
  if (selectedIds.length > 1) {
    const selSet = new Set(selectedIds)
    const groupObjs = objects.filter((o) => selSet.has(o.id))
    const minY = groupObjs.length > 0 ? Math.min(...groupObjs.map((o) => o.position[1])) : 0
    const importedObjs = groupObjs.filter((o) => o.kind === 'imported')
    const allWhite = importedObjs.length > 0 && importedObjs.every((o) => (o.celMode ?? 'white') === 'white')

    const handleGroupRotate90 = () => {
      if (groupObjs.length === 0) return
      const cx = groupObjs.reduce((acc, o) => acc + o.position[0], 0) / groupObjs.length
      const cz = groupObjs.reduce((acc, o) => acc + o.position[2], 0) / groupObjs.length
      batchUpdateObjects(
        selectedIds,
        (o) => {
          const dx = o.position[0] - cx
          const dz = o.position[2] - cz
          const [rx, ry, rz] = getObjectEuler(o)
          const ny = ry + Math.PI / 2
          return {
            position: [Number((cx + dz).toFixed(2)), o.position[1], Number((cz - dx).toFixed(2))],
            rotationY: ny,
            rotation: [rx, ny, rz],
          }
        },
        true,
      )
    }

    const handleGroupLand = () => {
      if (minY > 0.01) {
        batchUpdateObjects(
          selectedIds,
          (o) => ({
            position: [o.position[0], Number(Math.max(0, o.position[1] - minY).toFixed(2)), o.position[2]],
          }),
          true,
        )
      }
    }

    const handleBatchCelToggle = () => {
      const nextCel = allWhite ? 'colored' : 'white'
      batchUpdateObjects(
        importedObjs.map((o) => o.id),
        () => ({ celMode: nextCel }),
        true,
      )
    }

    const handleGroupScaleFactor = (factor: number) => {
      if (groupObjs.length === 0 || !Number.isFinite(factor) || factor <= 0) return
      const clamped = Math.max(0.1, Math.min(10, factor))
      const bounds = computeGroupBounds(groupObjs)
      const origMap = new Map(groupObjs.map((o) => [o.id, o]))
      batchUpdateObjects(
        selectedIds,
        (o) => {
          const orig = origMap.get(o.id)
          if (!orig) return {}
          return computeGroupScaledPatch(orig, bounds.pivot, clamped)
        },
        true,
      )
      showToast(ui.toastGroupScaled(groupObjs.length, Math.round(clamped * 100)))
    }

    const handleApplyPercent = () => {
      const pct = Number(scalePercentInput)
      if (!Number.isFinite(pct) || pct < 10 || pct > 1000) {
        showToast(ui.toastInvalidPct)
        return
      }
      handleGroupScaleFactor(pct / 100)
      setScalePercentInput('100')
    }

    const isGroupScaleMode = transformMode === 'scale'

    return (
      <div className="pointer-events-auto max-w-full">
        <div className="hud-surface flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 px-3.5 py-2 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold whitespace-nowrap px-2 py-0.5 rounded-lg"
              style={{
                background: 'var(--hud-pill-active-bg)',
                color: 'var(--hud-pill-active-text)',
                border: '1px solid var(--hud-pill-active-border)',
              }}
            >
              {ui.selectedCount(groupObjs.length)}
            </span>

            {/* Multi-selection Move / Scale Switcher */}
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-xl"
              style={{ background: 'var(--hud-bg-subtle)', border: '1px solid var(--hud-border)' }}
              role="group"
            >
              <button
                type="button"
                onClick={() => setTransformMode('move')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: !isGroupScaleMode ? 'var(--hud-pill-active-bg)' : 'transparent',
                  color: !isGroupScaleMode ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                  border: !isGroupScaleMode ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                  fontWeight: !isGroupScaleMode ? 600 : 500,
                }}
              >
                <Move className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.modeMove}</span>
              </button>
              <button
                type="button"
                onClick={() => setTransformMode('scale')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: isGroupScaleMode ? 'var(--hud-pill-active-bg)' : 'transparent',
                  color: isGroupScaleMode ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                  border: isGroupScaleMode ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                  fontWeight: isGroupScaleMode ? 600 : 500,
                }}
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.groupScaleBtn}</span>
              </button>
            </div>
          </div>

          <span className="hidden sm:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

          {isGroupScaleMode ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {(
                [
                  { label: '0.5×', factor: 0.5 },
                  { label: '0.8×', factor: 0.8 },
                  { label: '1.25×', factor: 1.25 },
                  { label: '2×', factor: 2 },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleGroupScaleFactor(preset.factor)}
                  className="px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                  style={{
                    background: 'var(--hud-bg-subtle)',
                    color: 'var(--hud-text)',
                    border: '1px solid var(--hud-border)',
                    fontWeight: 600,
                  }}
                >
                  {preset.label}
                </button>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={scalePercentInput}
                  onChange={(e) => setScalePercentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyPercent()
                  }}
                  className="hud-input w-14 px-1.5 py-1 rounded-md text-xs text-right"
                />
                <span style={{ color: 'var(--hud-text-muted)' }}>%</span>
                <button
                  type="button"
                  onClick={handleApplyPercent}
                  className="px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer font-semibold"
                  style={{
                    background: 'var(--hud-pill-active-bg)',
                    color: 'var(--hud-pill-active-text)',
                    border: '1px solid var(--hud-pill-active-border)',
                  }}
                >
                  {ui.apply}
                </button>
              </div>

              <span className="hidden xl:inline text-[11px] whitespace-nowrap" style={{ color: 'var(--hud-text-muted)' }}>
                {ui.groupScaleHint}
              </span>

              <button
                type="button"
                onClick={() => selectObject(null)}
                className="p-1.5 rounded-lg cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{ color: 'var(--hud-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={handleGroupRotate90}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.groupRotate90}</span>
              </button>

              {minY > 0.01 && (
                <button
                  type="button"
                  onClick={handleGroupLand}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    background: 'var(--hud-bg-subtle)',
                    color: 'var(--hud-text)',
                    border: '1px solid var(--hud-border)',
                  }}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                  <span>{ui.groupLand}</span>
                </button>
              )}

              {importedObjs.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchCelToggle}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    background: 'var(--hud-pill-active-bg)',
                    color: 'var(--hud-pill-active-text)',
                    border: '1px solid var(--hud-pill-active-border)',
                    fontWeight: 600,
                  }}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span>{allWhite ? ui.switchAllColor : ui.switchAllWhite}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleLockObjects(selectedIds)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text-secondary)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.batchLock}</span>
              </button>

              <button
                type="button"
                onClick={duplicateSelected}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text-secondary)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.batchDuplicate}</span>
              </button>

              <button
                type="button"
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: 'var(--hud-danger-bg)',
                  color: 'var(--hud-danger-text)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.batchDelete}</span>
              </button>

              <button
                type="button"
                onClick={() => selectObject(null)}
                title="取消多选 (Esc)"
                className="p-1.5 rounded-lg cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{ color: 'var(--hud-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const obj = selectedId ? objects.find((o) => o.id === selectedId) : null
  if (!obj) return null

  const saveModalEl =
    saveModalOpen &&
    obj.kind === 'imported' &&
    createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(13, 14, 35, 0.36)', backdropFilter: 'blur(4px)' }}
        onClick={() => !savingToLib && setSaveModalOpen(false)}
      >
        <div
          className="hud-surface w-full max-w-sm p-5 rounded-2xl flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4" style={{ color: 'var(--hud-action-bg)' }} />
              <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--hud-text)' }}>
                {ui.saveModalTitle}
              </h3>
            </div>
            <button
              type="button"
              disabled={savingToLib}
              onClick={() => setSaveModalOpen(false)}
              className="p-1 rounded-lg cursor-pointer"
              style={{ color: 'var(--hud-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--hud-text-secondary)' }}>
              {ui.assetNameLabel}
            </label>
            <input
              type="text"
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !savingToLib) {
                  setSavingToLib(true)
                  void saveObjectToLibrary(obj.id, saveName, saveCelMode).finally(() => {
                    setSavingToLib(false)
                    setSaveModalOpen(false)
                  })
                }
              }}
              placeholder={ui.assetNamePlaceholder}
              className="hud-input w-full px-3 py-2 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--hud-text-secondary)' }}>
              {ui.defaultStyleLabel}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'colored' as const, label: ui.styleColored },
                  { id: 'white' as const, label: ui.styleWhite },
                ] as const
              ).map((opt) => {
                const active = saveCelMode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSaveCelMode(opt.id)}
                    className="py-2 px-3 rounded-lg text-xs cursor-pointer"
                    style={{
                      background: active ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                      color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                      border: active
                        ? '1px solid var(--hud-pill-active-border)'
                        : '1px solid var(--hud-border)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] m-0 leading-relaxed" style={{ color: 'var(--hud-text-muted)' }}>
            {ui.saveModalHint}
          </p>

          <div
            className="pt-3 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--hud-border)' }}
          >
            <button
              type="button"
              disabled={savingToLib}
              onClick={() => setSaveModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ color: 'var(--hud-text-secondary)' }}
            >
              {ui.cancel}
            </button>
            <button
              type="button"
              disabled={savingToLib}
              onClick={() => {
                setSavingToLib(true)
                void saveObjectToLibrary(obj.id, saveName, saveCelMode).finally(() => {
                  setSavingToLib(false)
                  setSaveModalOpen(false)
                })
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
              style={{
                background: 'var(--hud-action-bg)',
                color: 'var(--hud-action-text)',
              }}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{savingToLib ? ui.saving : ui.confirmSaveToLib}</span>
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )

  // Locked Object Capsule: zero accidental edits, one-click unlock
  if (obj.locked) {
    return (
      <div className="pointer-events-auto max-w-full">
        <div className="hud-surface flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-3.5 py-2 rounded-2xl text-xs">
          <span
            className="flex items-center gap-1.5 font-semibold whitespace-nowrap px-2 py-0.5 rounded-lg"
            style={{
              background: 'var(--hud-snap-bg)',
              color: 'var(--hud-snap-text)',
              border: '1px solid var(--hud-snap-border)',
            }}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-36">{obj.name} · {ui.lockedSuffix}</span>
          </span>

          <span className="hidden md:inline text-[11px] whitespace-nowrap" style={{ color: 'var(--hud-text-muted)' }}>
            {ui.lockedBannerHint}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleLockObjects([obj.id])}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: 'var(--hud-pill-active-bg)',
                color: 'var(--hud-pill-active-text)',
                border: '1px solid var(--hud-pill-active-border)',
              }}
            >
              <Unlock className="w-3.5 h-3.5 shrink-0" />
              <span>{ui.unlockWithKey}</span>
            </button>

            {obj.kind === 'imported' && (
              <button
                type="button"
                onClick={() => {
                  setSaveName(obj.name)
                  setSaveCelMode(obj.celMode ?? 'colored')
                  setSaveModalOpen(true)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.saveToLib}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => selectObject(null)}
              title="取消选中 (Esc)"
              className="p-1.5 rounded-lg cursor-pointer hover:bg-[var(--hud-bg-hover)]"
              style={{ color: 'var(--hud-text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {saveModalEl}
      </div>
    )
  }

  const def = getAssetDef(obj.kind)
  const [rx, ry, rz] = getObjectEuler(obj)

  const handleSizeInput = (axis: 0 | 1 | 2, rawVal: string) => {
    const parsed = Number(rawVal)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    const clamped = Math.max(def.minSize[axis], Math.min(120, parsed))

    if (obj.uniformLock) {
      const ratio = clamped / Math.max(0.1, obj.size[axis])
      const nextSize: [number, number, number] = [
        Number(Math.max(def.minSize[0], obj.size[0] * ratio).toFixed(2)),
        Number(Math.max(def.minSize[1], obj.size[1] * ratio).toFixed(2)),
        Number(Math.max(def.minSize[2], obj.size[2] * ratio).toFixed(2)),
      ]
      updateObject(obj.id, { size: nextSize }, true)
    } else {
      const nextSize: [number, number, number] = [...obj.size] as [number, number, number]
      nextSize[axis] = Number(clamped.toFixed(2))
      updateObject(obj.id, { size: nextSize }, true)
    }
  }

  const handleRotDegInput = (axis: 0 | 1 | 2, rawDeg: string) => {
    const deg = Number(rawDeg)
    if (!Number.isFinite(deg)) return
    const next: [number, number, number] = [rx, ry, rz]
    next[axis] = Number((deg * DEG_TO_RAD).toFixed(4))
    updateObject(obj.id, { rotation: next, rotationY: next[1] }, true)
  }

  const handleHeightInput = (rawVal: string) => {
    const parsed = Number(rawVal)
    if (!Number.isFinite(parsed)) return
    const clamped = Math.max(0, Math.min(120, parsed))
    updateObject(
      obj.id,
      { position: [obj.position[0], Number(clamped.toFixed(2)), obj.position[2]] },
      true,
    )
  }

  return (
    <div className="pointer-events-auto max-w-full">
      <div className="hud-surface flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-3 py-2 rounded-2xl text-xs">
        {/* Group 1: Selected Name + Independent 3-Mode Switcher (Move / Rotate / Scale) */}
        <div className="flex items-center gap-2">
          <span
            className="font-semibold truncate max-w-28 whitespace-nowrap"
            style={{ color: 'var(--hud-text)' }}
            title={obj.name}
          >
            {obj.name}
          </span>

          <div
            className="flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{ background: 'var(--hud-bg-subtle)', border: '1px solid var(--hud-border)' }}
            role="group"
            aria-label="变换模式"
          >
            {modeTabs.map((t) => {
              const active = transformMode === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTransformMode(t.id)}
                  title={`${t.label} (${t.keyHint})`}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  style={{
                    background: active ? 'var(--hud-pill-active-bg)' : 'transparent',
                    color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                    border: active ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <span className="hidden md:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

        {/* Group 2: Contextual Mode Controls */}
        {transformMode === 'move' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSurfaceAttach(!surfaceAttach)}
              title="开启后拖到墙面或任意物体表面自动贴合挂靠（也可拖动时按住 Shift 临时开启）"
              className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: surfaceAttach ? 'var(--hud-snap-bg)' : 'var(--hud-bg-subtle)',
                color: surfaceAttach ? 'var(--hud-snap-text)' : 'var(--hud-text-secondary)',
                border: surfaceAttach
                  ? '1px solid var(--hud-snap-border)'
                  : '1px solid var(--hud-border)',
                fontWeight: surfaceAttach ? 600 : 500,
              }}
            >
              <Pin className="w-3.5 h-3.5 shrink-0" />
              <span>{surfaceAttach ? ui.attachOn : ui.attachOff}</span>
            </button>

            <label
              className="flex items-center gap-1 whitespace-nowrap"
              style={{ color: 'var(--hud-text-muted)' }}
            >
              <span className="font-semibold">{ui.elevation}</span>
              <input
                type="number"
                step={0.25}
                min={0}
                max={120}
                value={Number(obj.position[1].toFixed(2))}
                onChange={(e) => handleHeightInput(e.target.value)}
                className="hud-input w-14 px-1.5 py-1 rounded-md text-xs text-right"
              />
              <span>m</span>
            </label>

            {obj.position[1] > 0.01 && (
              <button
                type="button"
                onClick={() =>
                  updateObject(obj.id, { position: [obj.position[0], 0, obj.position[2]] }, true)
                }
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.landBtn}</span>
              </button>
            )}
          </div>
        )}

        {transformMode === 'rotate' && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {(
              [
                { label: 'RX', idx: 0 as const, val: rx },
                { label: 'RY', idx: 1 as const, val: ry },
                { label: 'RZ', idx: 2 as const, val: rz },
              ] as const
            ).map(({ label, idx, val }) => (
              <label
                key={label}
                className="flex items-center gap-1 whitespace-nowrap"
                style={{ color: 'var(--hud-text-muted)' }}
              >
                <span className="font-semibold">{label}</span>
                <input
                  type="number"
                  step={15}
                  value={normDeg(val)}
                  onChange={(e) => handleRotDegInput(idx, e.target.value)}
                  aria-label={`${label} 旋转角度`}
                  className="hud-input w-13 px-1.5 py-1 rounded-md text-xs text-right"
                />
                <span>°</span>
              </label>
            ))}

            <button
              type="button"
              onClick={() => {
                const ny = ry + Math.PI / 2
                updateObject(obj.id, { rotationY: ny, rotation: [rx, ny, rz] }, true)
              }}
              title="水平旋转 +90° (快捷键 R)"
              className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: 'var(--hud-bg-subtle)',
                color: 'var(--hud-text)',
                border: '1px solid var(--hud-border)',
              }}
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>90°</span>
            </button>

            <button
              type="button"
              onClick={() => updateObject(obj.id, { rotationY: 0, rotation: [0, 0, 0] }, true)}
              title="三轴角度全部归零"
              className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: 'var(--hud-bg-subtle)',
                color: 'var(--hud-text-secondary)',
                border: '1px solid var(--hud-border)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>{ui.resetRot}</span>
            </button>
          </div>
        )}

        {transformMode === 'scale' && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => updateObject(obj.id, { uniformLock: !obj.uniformLock }, true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: obj.uniformLock ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                color: obj.uniformLock ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                border: obj.uniformLock
                  ? '1px solid var(--hud-pill-active-border)'
                  : '1px solid var(--hud-border)',
                fontWeight: obj.uniformLock ? 600 : 500,
              }}
            >
              {obj.uniformLock ? (
                <Lock className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{obj.uniformLock ? ui.xyzLock : ui.xyzFree}</span>
            </button>

            {(
              [
                { label: 'X', idx: 0 as const },
                { label: 'Y', idx: 1 as const },
                { label: 'Z', idx: 2 as const },
              ] as const
            ).map(({ label, idx }) => (
              <label
                key={label}
                className="flex items-center gap-1 whitespace-nowrap"
                style={{ color: 'var(--hud-text-muted)' }}
              >
                <span className="font-semibold">{label}</span>
                <input
                  type="number"
                  step={0.5}
                  min={def.minSize[idx]}
                  max={120}
                  value={Number(obj.size[idx].toFixed(1))}
                  onChange={(e) => handleSizeInput(idx, e.target.value)}
                  aria-label={`${label} 尺寸（米）`}
                  className="hud-input w-12 px-1.5 py-1 rounded-md text-xs text-right"
                />
              </label>
            ))}
          </div>
        )}

        <span className="hidden md:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

        {/* Group 3: Material Toggle + Quiet Tertiary Actions */}
        <div className="flex items-center gap-1">
          {def.supportsLitWindows && (
            <button
              type="button"
              onClick={() => updateObject(obj.id, { litWindows: !obj.litWindows }, true)}
              title="黄昏与雨夜是否自动亮起暖黄窗户"
              className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: obj.litWindows ? 'var(--hud-snap-bg)' : 'var(--hud-bg-subtle)',
                color: obj.litWindows ? 'var(--hud-snap-text)' : 'var(--hud-text-secondary)',
                border: obj.litWindows
                  ? '1px solid var(--hud-snap-border)'
                  : '1px solid var(--hud-border)',
                fontWeight: obj.litWindows ? 600 : 500,
              }}
            >
              <Lamp className="w-3.5 h-3.5 shrink-0" />
              <span>{ui.litWindows}</span>
            </button>
          )}

          {obj.kind === 'imported' && (
            <>
              <button
                type="button"
                onClick={() => setImportedCelMode(obj.id, obj.celMode === 'white' ? 'colored' : 'white')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: 'var(--hud-pill-active-bg)',
                  color: 'var(--hud-pill-active-text)',
                  border: '1px solid var(--hud-pill-active-border)',
                  fontWeight: 600,
                }}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>{obj.celMode === 'white' ? ui.celWhite : ui.celColored}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaveName(obj.name)
                  setSaveCelMode(obj.celMode ?? 'colored')
                  setSaveModalOpen(true)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer hover:bg-[var(--hud-bg-hover)]"
                style={{
                  background: 'var(--hud-snap-bg)',
                  color: 'var(--hud-snap-text)',
                  border: '1px solid var(--hud-snap-border)',
                  fontWeight: 600,
                }}
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.saveToLib}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => toggleLockObjects([obj.id])}
            className="flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:bg-[var(--hud-bg-hover)]"
            style={{
              background: 'var(--hud-bg-subtle)',
              color: 'var(--hud-text-secondary)',
              border: '1px solid var(--hud-border)',
            }}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{ui.lockBtn}</span>
          </button>

          <button
            type="button"
            onClick={duplicateSelected}
            title="复制一份 (Ctrl+D)"
            className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--hud-bg-hover)]"
            style={{ color: 'var(--hud-text-secondary)' }}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            title="移除 (Delete)"
            className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--hud-danger-bg)] hover:text-[var(--hud-danger-text)]"
            style={{ color: 'var(--hud-text-muted)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {saveModalEl}
    </div>
  )
}
