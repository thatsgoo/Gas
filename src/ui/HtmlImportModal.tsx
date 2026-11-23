import { useEffect, useMemo, useState } from 'react'
import { Box, Check, FileCode2, Layers, Palette, X } from 'lucide-react'
import { getUiStrings } from '../i18n/translations'
import { finalizeExtractedHtmlNodes } from '../importer/htmlImporter'
import { useSceneStore } from '../store/useSceneStore'
import type { ImportedCelMode } from '../types/scene'

export function HtmlImportModal() {
  const language = useSceneStore((s) => s.language)
  const extraction = useSceneStore((s) => s.pendingHtmlExtraction)
  const setPending = useSceneStore((s) => s.setPendingHtmlExtraction)
  const batchImportHtmlObjects = useSceneStore((s) => s.batchImportHtmlObjects)
  const showToast = useSceneStore((s) => s.showToast)
  const ui = getUiStrings(language)

  const [mode, setMode] = useState<'deep' | 'top' | 'merge'>('deep')
  const [celMode, setCelMode] = useState<ImportedCelMode>('colored')
  const [replaceCanvas, setReplaceCanvas] = useState(true)
  const [skipEnvironment, setSkipEnvironment] = useState(true)
  const [hideDefaultBase, setHideDefaultBase] = useState(true)
  const [busy, setBusy] = useState(false)

  const hasOwnBase = useMemo(() => {
    if (!extraction) return false
    const allNodes = [...extraction.deepNodes, ...extraction.topNodes]
    return allNodes.some((n) => {
      if (n.isLikelyEnvironment) return false
      if (/base|plinth|platform|ground|street|road|slab|diorama|terrain|floor|底座|基底|地面|路面/i.test(n.name)) {
        return true
      }
      const [sx, sy, sz] = n.size
      return sx >= 8 && sz >= 8 && sy <= Math.max(6, Math.min(sx, sz) * 0.45) && n.position[1] <= 1.2
    })
  }, [extraction])

  useEffect(() => {
    if (extraction) {
      setHideDefaultBase(hasOwnBase)
    }
  }, [extraction, hasOwnBase])

  if (!extraction) return null

  const MAX_SPLIT_OBJECTS = 200
  const deepCleanCount = (skipEnvironment
    ? extraction.deepNodes.filter((n) => !n.isLikelyEnvironment)
    : extraction.deepNodes
  ).length
  const topCleanCount = (skipEnvironment
    ? extraction.topNodes.filter((n) => !n.isLikelyEnvironment)
    : extraction.topNodes
  ).length

  const deepDisabled = deepCleanCount > MAX_SPLIT_OBJECTS
  const topDisabled = topCleanCount > MAX_SPLIT_OBJECTS

  const effectiveMode: 'deep' | 'top' | 'merge' =
    mode === 'deep' && deepDisabled
      ? topDisabled
        ? 'merge'
        : 'top'
      : mode === 'top' && topDisabled
        ? 'merge'
        : mode

  const activePool = effectiveMode === 'top' ? extraction.topNodes : extraction.deepNodes
  const envCount = activePool.filter((n) => n.isLikelyEnvironment).length
  const visibleNodes = skipEnvironment ? activePool.filter((n) => !n.isLikelyEnvironment) : activePool
  const finalNodes = visibleNodes.length > 0 ? visibleNodes : activePool

  const handleConfirm = async () => {
    setBusy(true)
    try {
      const { assets, objects, suggestedBase } = await finalizeExtractedHtmlNodes(extraction, {
        mode: effectiveMode,
        celMode,
        skipEnvironment,
        autoScaleIfHuge: true,
      })
      batchImportHtmlObjects({
        assets,
        objects,
        replaceCanvas,
        hideDefaultBase,
        autoFitBase: suggestedBase,
      })
      setPending(null)
      showToast(ui.toastImportedHtmlCount(objects.length))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'HTML import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(13, 14, 35, 0.36)', backdropFilter: 'blur(4px)' }}
    >
      <div className="hud-surface w-full max-w-lg p-5 rounded-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="p-2 rounded-xl shrink-0"
              style={{
                background: 'var(--hud-pill-active-bg)',
                color: 'var(--hud-pill-active-text)',
              }}
            >
              <FileCode2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--hud-text)' }}>
                {ui.htmlModalTitle}
              </h2>
              <p className="text-xs m-0 mt-0.5 truncate" style={{ color: 'var(--hud-text-muted)' }}>
                {ui.htmlModalSub(extraction.fileName, deepCleanCount, envCount)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPending(null)}
            disabled={busy}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--hud-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detected preview chips */}
        <div
          className="studio-scroll flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2.5 rounded-xl"
          style={{ background: 'var(--hud-bg-subtle)', border: '1px solid var(--hud-border)' }}
        >
          {finalNodes.slice(0, 28).map((n) => (
            <span
              key={n.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
              style={{
                background: 'var(--hud-bg-solid)',
                color: 'var(--hud-text-secondary)',
                border: '1px solid var(--hud-border)',
              }}
            >
              <Box className="w-3 h-3 shrink-0" style={{ color: 'var(--hud-text-muted)' }} />
              <span className="truncate max-w-32">{n.name}</span>
            </span>
          ))}
          {finalNodes.length > 28 && (
            <span className="text-[11px] px-1.5 py-0.5" style={{ color: 'var(--hud-text-muted)' }}>
              +{finalNodes.length - 28}
            </span>
          )}
        </div>

        {/* Option 1: 3-Tier Split Granularity */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--hud-text)' }}>
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--hud-text-muted)' }} />
            {ui.splitGranularity}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {
                  id: 'deep' as const,
                  title: ui.splitDeep(deepCleanCount),
                  desc: ui.splitDeepDesc,
                  disabled: deepDisabled,
                },
                {
                  id: 'top' as const,
                  title: ui.splitTop(topCleanCount),
                  desc: ui.splitTopDesc,
                  disabled: topDisabled,
                },
                {
                  id: 'merge' as const,
                  title: ui.splitMerge,
                  desc: ui.splitMergeDesc,
                  disabled: false,
                },
              ] as const
            ).map((opt) => {
              const active = effectiveMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => setMode(opt.id)}
                  className="p-2.5 rounded-xl text-left text-xs cursor-pointer disabled:opacity-45"
                  style={{
                    background: active ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                    color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                    border: active
                      ? '1px solid var(--hud-pill-active-border)'
                      : '1px solid var(--hud-border)',
                  }}
                >
                  <div className="font-semibold whitespace-nowrap">{opt.title}</div>
                  <div className="text-[11px] mt-0.5 opacity-80 leading-snug">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Option 2: Cel Shading Style */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--hud-text)' }}>
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--hud-text-muted)' }} />
            {ui.celFusion}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'colored' as const, title: ui.celColoredRec, desc: ui.celColoredDesc },
                { id: 'white' as const, title: ui.styleWhite, desc: ui.celWhiteDesc },
              ] as const
            ).map((opt) => {
              const active = celMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCelMode(opt.id)}
                  className="p-2.5 rounded-xl text-left text-xs cursor-pointer"
                  style={{
                    background: active ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                    color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                    border: active
                      ? '1px solid var(--hud-pill-active-border)'
                      : '1px solid var(--hud-border)',
                  }}
                >
                  <div className="font-semibold">{opt.title}</div>
                  <div className="text-[11px] mt-0.5 opacity-80">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Option 3: Hide Default Base + Replace vs Append + Skip Env/FX */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--hud-text-secondary)' }}>
            <input
              type="checkbox"
              checked={hideDefaultBase}
              onChange={(e) => setHideDefaultBase(e.target.checked)}
              className="accent-[var(--hud-action-bg)]"
            />
            <span>
              {ui.hideDefaultBaseOpt}
              {hasOwnBase ? ui.hideDefaultBaseAuto : ui.hideDefaultBaseManual}
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--hud-text-secondary)' }}>
            <input
              type="checkbox"
              checked={replaceCanvas}
              onChange={(e) => setReplaceCanvas(e.target.checked)}
              className="accent-[var(--hud-action-bg)]"
            />
            <span>{ui.replaceCanvasOpt}</span>
          </label>
          {envCount > 0 && (
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--hud-text-secondary)' }}>
              <input
                type="checkbox"
                checked={skipEnvironment}
                onChange={(e) => setSkipEnvironment(e.target.checked)}
                className="accent-[var(--hud-action-bg)]"
              />
              <span>{ui.skipEnvOpt}</span>
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="pt-3 flex items-center justify-end gap-2"
          style={{ borderTop: '1px solid var(--hud-border)' }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => setPending(null)}
            className="px-3.5 py-2 rounded-lg text-xs cursor-pointer"
            style={{ color: 'var(--hud-text-secondary)' }}
          >
            {ui.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
            style={{
              background: 'var(--hud-action-bg)',
              color: 'var(--hud-action-text)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {busy
                ? ui.packingImport
                : ui.confirmImportCount(effectiveMode === 'merge' ? 1 : finalNodes.length)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
