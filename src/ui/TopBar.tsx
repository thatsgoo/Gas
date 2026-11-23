/*
 * Refactoring UI Workflow B — Constraint Brief
 * --------------------------------------------
 * Content Ranking:
 *   Primary Action (1 per screen): "导出" (solid --hud-action-bg / --hud-action-text, 5.87:1 contrast)
 *   Secondary Controls: Weather switcher, Auto-Snap toggle, Camera mode switch (flipped tint pills + icons)
 *   Tertiary Controls: Sun angle, Audio, Base settings, Bookmarks, Undo/Redo (ghost icon buttons)
 * Tokens Used:
 *   Spacing: 4px intra-group, 12px inter-group (Law 5), 16px viewport inset
 *   Weights: 500 default, 600 active/labels (Law 6)
 *   Radius: 8px controls, 16px floating capsules
 */
import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Camera,
  Check,
  CloudFog,
  CloudRain,
  Compass,
  Download,
  Eye,
  FileCode2,
  Footprints,
  Globe,
  Grid2x2,
  Image as ImageIcon,
  Layers,
  Lock,
  Magnet,
  Maximize2,
  Plus,
  Redo2,
  RotateCcw,
  Sun,
  Sunset,
  Trash2,
  Undo2,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { SceneCanvasHandle } from '../engine/SceneCanvas'
import { WEATHER_LIST } from '../engine/weatherPresets'
import { downloadStandaloneHtml } from '../exporter/exportStandaloneHtml'
import { getUiStrings, LANGUAGE_OPTIONS, WEATHER_I18N } from '../i18n/translations'
import { extractExternalThreeHtml, tryParseNativeSketchpadHtml } from '../importer/htmlImporter'
import { useSceneStore } from '../store/useSceneStore'
import { getBaseMode, type BaseMode, type WeatherPreset } from '../types/scene'

interface TopBarProps {
  canvasRef: React.RefObject<SceneCanvasHandle | null>
}

const WEATHER_ICONS: Record<WeatherPreset, React.ReactNode> = {
  afternoon: <Sun className="w-3.5 h-3.5" />,
  dawn: <CloudFog className="w-3.5 h-3.5" />,
  dusk: <Sunset className="w-3.5 h-3.5" />,
  rain: <CloudRain className="w-3.5 h-3.5" />,
}

type OpenPopover = null | 'base' | 'bookmarks' | 'locks' | 'lang' | 'export'

export function TopBar({ canvasRef }: TopBarProps) {
  const language = useSceneStore((s) => s.language)
  const weather = useSceneStore((s) => s.weather)
  const sunAngle = useSceneStore((s) => s.sunAngle)
  const audioEnabled = useSceneStore((s) => s.audioEnabled)
  const snapEnabled = useSceneStore((s) => s.snapEnabled)
  const editingBase = useSceneStore((s) => s.editingBase)
  const base = useSceneStore((s) => s.base)
  const objects = useSceneStore((s) => s.objects)
  const cameraMode = useSceneStore((s) => s.cameraMode)
  const bookmarks = useSceneStore((s) => s.bookmarks)
  const pastLen = useSceneStore((s) => s.past.length)
  const futureLen = useSceneStore((s) => s.future.length)

  const setLanguage = useSceneStore((s) => s.setLanguage)
  const setWeather = useSceneStore((s) => s.setWeather)
  const setSunAngle = useSceneStore((s) => s.setSunAngle)
  const setAudioEnabled = useSceneStore((s) => s.setAudioEnabled)
  const setSnapEnabled = useSceneStore((s) => s.setSnapEnabled)
  const setEditingBase = useSceneStore((s) => s.setEditingBase)
  const setBase = useSceneStore((s) => s.setBase)
  const setCameraMode = useSceneStore((s) => s.setCameraMode)
  const flyCameraTo = useSceneStore((s) => s.flyCameraTo)
  const addBookmark = useSceneStore((s) => s.addBookmark)
  const removeBookmark = useSceneStore((s) => s.removeBookmark)
  const selectObject = useSceneStore((s) => s.selectObject)
  const toggleLockObjects = useSceneStore((s) => s.toggleLockObjects)
  const unlockAllObjects = useSceneStore((s) => s.unlockAllObjects)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const clearCanvas = useSceneStore((s) => s.clearCanvas)
  const loadStarterScene = useSceneStore((s) => s.loadStarterScene)
  const exportSerializedScene = useSceneStore((s) => s.exportSerializedScene)
  const loadSerializedScene = useSceneStore((s) => s.loadSerializedScene)
  const setPendingHtmlExtraction = useSceneStore((s) => s.setPendingHtmlExtraction)
  const showToast = useSceneStore((s) => s.showToast)

  const ui = getUiStrings(language)
  const weatherI18n = WEATHER_I18N[language]
  const curLangOpt = LANGUAGE_OPTIONS.find((l) => l.code === language) ?? LANGUAGE_OPTIONS[0]

  const baseMode = getBaseMode(base)
  const lockedObjects = objects.filter((o) => o.locked)
  const [popover, setPopover] = useState<OpenPopover>(null)
  const [pngAspect, setPngAspect] = useState<'current' | '16:9' | '3:2' | '4:5'>('16:9')
  const [pngTransparent, setPngTransparent] = useState(false)
  const [importingHtml, setImportingHtml] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const htmlInputRef = useRef<HTMLInputElement>(null)

  const handleImportHtmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportingHtml(true)
    try {
      const text = await file.text()
      const native = tryParseNativeSketchpadHtml(text)
      if (native) {
        loadSerializedScene(native)
        showToast(`已无损还原沙盒工程「${file.name}」`)
        return
      }
      showToast(`正在沙箱中解析 Three.js HTML「${file.name}」...`)
      const extraction = await extractExternalThreeHtml(text, file.name)
      setPendingHtmlExtraction(extraction)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '解析 HTML 场景失败')
    } finally {
      setImportingHtml(false)
    }
  }

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setPopover(null)
      }
    }
    window.addEventListener('mousedown', onDocDown)
    return () => window.removeEventListener('mousedown', onDocDown)
  }, [])

  const handleExportHtml = () => {
    const sceneData = exportSerializedScene()
    const bytes = downloadStandaloneHtml(sceneData, 'gas-miniature.html')
    const kb = Math.round(bytes / 1024)
    showToast(ui.toastExportedHtml(kb))
    setPopover(null)
  }

  const handleExportPng = () => {
    canvasRef.current?.captureBoardPng({ aspect: pngAspect, transparent: pngTransparent })
    showToast(ui.toastExportedPng(pngAspect === 'current' ? ui.aspectCurrent : pngAspect))
    setPopover(null)
  }

  const handleSaveBookmark = () => {
    const snap = canvasRef.current?.getCameraSnapshot()
    if (!snap) return
    const label =
      snap.mode === 'walk'
        ? ui.walkCamLabel(bookmarks.length + 1)
        : ui.orbitCamLabel(bookmarks.length + 1)
    addBookmark({ name: label, ...snap })
    showToast(ui.toastSavedBookmark(label))
  }

  return (
    <div
      ref={barRef}
      className="fixed top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-3 pointer-events-none"
    >
      {/* Top-Left: Atmosphere Presets + Sun Azimuth + Soundscape */}
      <div className="hud-surface pointer-events-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-2.5 py-1.5 rounded-2xl">
        <div className="flex items-center gap-0.5 sm:gap-1" role="group">
          {WEATHER_LIST.map((w) => {
            const active = w.id === weather
            const wText = weatherI18n[w.id]
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setWeather(w.id)}
                title={wText.full}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                style={{
                  background: active ? 'var(--hud-pill-active-bg)' : 'transparent',
                  color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                  border: active ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {WEATHER_ICONS[w.id]}
                <span>{wText.short}</span>
              </button>
            )
          })}
        </div>

        <span className="hidden sm:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

        <div className="flex items-center gap-2 px-1" title={ui.sunAngleTitle}>
          <Compass className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hud-text-muted)' }} />
          <input
            type="range"
            min={0}
            max={360}
            value={sunAngle}
            onChange={(e) => setSunAngle(Number(e.target.value))}
            aria-label={ui.sunAngleTitle}
            className="w-16 h-1.5 accent-[var(--hud-action-bg)] cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => setAudioEnabled(!audioEnabled)}
          title={audioEnabled ? ui.audioToggleOff : ui.audioToggleOn}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          style={{
            background: audioEnabled ? 'var(--hud-pill-active-bg)' : 'transparent',
            color: audioEnabled ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
            border: audioEnabled ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
            fontWeight: audioEnabled ? 600 : 500,
          }}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden sm:inline">{audioEnabled ? ui.audioOn : ui.audioOff}</span>
        </button>
      </div>

      {/* Top-Right: Snap + Base + Camera + Undo/Redo + Primary Export */}
      <div className="relative pointer-events-auto flex flex-wrap items-center gap-2">
        <div className="hud-surface flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5 rounded-2xl">
          {/* Group 1: Auto-Snap & Base */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSnapEnabled(!snapEnabled)}
              title="自动吸附开关（网格、墙面贴边、自动堆叠、15°旋转）"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: snapEnabled ? 'var(--hud-snap-bg)' : 'transparent',
                color: snapEnabled ? 'var(--hud-snap-text)' : 'var(--hud-text-secondary)',
                border: snapEnabled ? '1px solid var(--hud-snap-border)' : '1px solid transparent',
                fontWeight: snapEnabled ? 600 : 500,
              }}
            >
              <Magnet className="w-3.5 h-3.5 shrink-0" />
              <span>{snapEnabled ? ui.snapOn : ui.snapOff}</span>
            </button>

            <button
              type="button"
              onClick={() => setPopover(popover === 'base' ? null : 'base')}
              title={ui.baseTitle}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: popover === 'base' || editingBase ? 'var(--hud-pill-active-bg)' : 'transparent',
                color: popover === 'base' || editingBase ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                border:
                  popover === 'base' || editingBase
                    ? '1px solid var(--hud-pill-active-border)'
                    : '1px solid transparent',
                fontWeight: popover === 'base' || editingBase ? 600 : 500,
              }}
            >
              <Grid2x2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {baseMode === 'none' ? ui.baseHidden : `${base.width}×${base.depth}m`}
              </span>
            </button>

            {lockedObjects.length > 0 && (
              <button
                type="button"
                onClick={() => setPopover(popover === 'locks' ? null : 'locks')}
                title={ui.lockedTitle}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                style={{
                  background: popover === 'locks' ? 'var(--hud-pill-active-bg)' : 'var(--hud-snap-bg)',
                  color: popover === 'locks' ? 'var(--hud-pill-active-text)' : 'var(--hud-snap-text)',
                  border:
                    popover === 'locks'
                      ? '1px solid var(--hud-pill-active-border)'
                      : '1px solid var(--hud-snap-border)',
                  fontWeight: 600,
                }}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{ui.lockedCount(lockedObjects.length)}</span>
              </button>
            )}
          </div>

          <span className="hidden sm:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

          {/* Group 2: Dual Camera + Bookmarks */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCameraMode(cameraMode === 'orbit' ? 'walk' : 'orbit')}
              title={ui.cameraToggleTitle}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: cameraMode === 'walk' ? 'var(--hud-pill-active-bg)' : 'transparent',
                color: cameraMode === 'walk' ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                border:
                  cameraMode === 'walk' ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                fontWeight: cameraMode === 'walk' ? 600 : 500,
              }}
            >
              {cameraMode === 'walk' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <Footprints className="w-3.5 h-3.5 shrink-0" />}
              <span>{cameraMode === 'walk' ? ui.orbitMode : ui.walkMode}</span>
            </button>

            <button
              type="button"
              onClick={() => setPopover(popover === 'bookmarks' ? null : 'bookmarks')}
              title={ui.bookmarksTitle}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: popover === 'bookmarks' ? 'var(--hud-pill-active-bg)' : 'transparent',
                color: popover === 'bookmarks' ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                border:
                  popover === 'bookmarks' ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
              }}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <span className="hidden sm:block w-px h-4" style={{ background: 'var(--hud-border)' }} />

          {/* Group 3: Undo / Redo + Language Switcher */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={undo}
              disabled={pastLen === 0}
              title={ui.undoTitle}
              className="hidden sm:inline-flex p-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ color: 'var(--hud-text-secondary)' }}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={futureLen === 0}
              title={ui.redoTitle}
              className="hidden sm:inline-flex p-1.5 rounded-lg transition-opacity cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ color: 'var(--hud-text-secondary)' }}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPopover(popover === 'lang' ? null : 'lang')}
              title={ui.languageTitle}
              aria-label={ui.languageTitle}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                background: popover === 'lang' ? 'var(--hud-pill-active-bg)' : 'transparent',
                color: popover === 'lang' ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                border:
                  popover === 'lang' ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                fontWeight: 600,
              }}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{curLangOpt.short}</span>
            </button>
          </div>

          {/* Secondary Import HTML button */}
          <input
            ref={htmlInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleImportHtmlFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={importingHtml}
            onClick={() => htmlInputRef.current?.click()}
            title={ui.importHtmlTitle}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            style={{
              background: 'var(--hud-bg-subtle)',
              color: 'var(--hud-text)',
              border: '1px solid var(--hud-border)',
            }}
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{importingHtml ? ui.parsingHtml : ui.importHtml}</span>
          </button>

          {/* Primary Action */}
          <button
            type="button"
            onClick={() => setPopover(popover === 'export' ? null : 'export')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-92 cursor-pointer"
            style={{
              background: 'var(--hud-action-bg)',
              color: 'var(--hud-action-text)',
            }}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{ui.exportBtn}</span>
          </button>
        </div>

        {/* Popover: Language Selector */}
        {popover === 'lang' && (
          <div className="hud-surface absolute right-0 top-12 w-44 p-2 rounded-2xl flex flex-col gap-1">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = opt.code === language
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.code)
                    setPopover(null)
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    background: active ? 'var(--hud-pill-active-bg)' : 'transparent',
                    color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text)',
                    border: active ? '1px solid var(--hud-pill-active-border)' : '1px solid transparent',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        )}

        {/* Popover: Base Configuration */}
        {popover === 'base' && (
          <div className="hud-surface absolute right-0 top-12 w-76 p-4 rounded-2xl flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--hud-text)' }}>
                  {ui.basePresetHeader}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--hud-text-muted)' }}>
                  {base.width}×{base.depth}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: ui.preset30, v: 30 },
                  { label: ui.preset60, v: 60 },
                  { label: ui.preset200, v: 200 },
                  { label: ui.preset1000, v: 1000 },
                ].map((opt) => {
                  const isCur = base.width === opt.v && base.depth === opt.v
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setBase({ width: opt.v, depth: opt.v, offsetX: 0, offsetZ: 0 }, true)}
                      className="px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                      style={{
                        background: isCur ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                        color: isCur ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                        border: isCur
                          ? '1px solid var(--hud-pill-active-border)'
                          : '1px solid var(--hud-border)',
                        fontWeight: isCur ? 600 : 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBase(!editingBase)
                  setPopover(null)
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer"
                style={{
                  background: editingBase ? 'var(--hud-snap-bg)' : 'var(--hud-bg-subtle)',
                  color: editingBase ? 'var(--hud-snap-text)' : 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                  fontWeight: 600,
                }}
              >
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5" />
                  {ui.stretchBaseBtn}
                </span>
                <span>{editingBase ? ui.editing : ui.enable}</span>
              </button>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--hud-text)' }}>
                  <Layers className="w-3.5 h-3.5" style={{ color: 'var(--hud-text-muted)' }} />
                  <span>{ui.baseDisplayLabel}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'diorama' as BaseMode, label: ui.baseDiorama },
                      { id: 'horizon' as BaseMode, label: ui.baseHorizon },
                      { id: 'none' as BaseMode, label: ui.baseNone },
                    ] as const
                  ).map((opt) => {
                    const active = baseMode === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setBase(
                            {
                              baseMode: opt.id,
                              showBase: opt.id === 'diorama',
                            },
                            true,
                          )
                        }
                        className="py-1.5 px-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors"
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
                <p className="text-[11px] m-0 leading-snug" style={{ color: 'var(--hud-text-muted)' }}>
                  {ui.baseNoneHint}
                </p>
              </div>
            </div>

            <div
              className="pt-3 flex items-center justify-between gap-2"
              style={{ borderTop: '1px solid var(--hud-border)' }}
            >
              <button
                type="button"
                onClick={() => {
                  loadStarterScene()
                  setPopover(null)
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{ color: 'var(--hud-text-secondary)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{ui.starterScene}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCanvas()
                  setPopover(null)
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{ background: 'var(--hud-danger-bg)', color: 'var(--hud-danger-text)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{ui.clearBase}</span>
              </button>
            </div>
          </div>
        )}

        {/* Popover: Locked Objects Manager */}
        {popover === 'locks' && lockedObjects.length > 0 && (
          <div className="hud-surface absolute right-0 top-12 w-68 p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{ui.locksHeader(lockedObjects.length)}</span>
              <button
                type="button"
                onClick={() => {
                  unlockAllObjects()
                  setPopover(null)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
                style={{
                  background: 'var(--hud-pill-active-bg)',
                  color: 'var(--hud-pill-active-text)',
                }}
              >
                <Unlock className="w-3 h-3" />
                {ui.unlockAll}
              </button>
            </div>
            <div className="studio-scroll flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {lockedObjects.map((lo) => (
                <div
                  key={lo.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--hud-bg-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectObject(lo.id)
                      setPopover(null)
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                    style={{ color: 'var(--hud-text)' }}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hud-snap-text)' }} />
                    <span className="truncate">{lo.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleLockObjects([lo.id])
                      if (lockedObjects.length <= 1) setPopover(null)
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 cursor-pointer"
                    style={{
                      background: 'var(--hud-bg-solid)',
                      color: 'var(--hud-text-secondary)',
                      border: '1px solid var(--hud-border)',
                    }}
                  >
                    {ui.unlock}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] m-0 leading-snug" style={{ color: 'var(--hud-text-muted)' }}>
              {ui.locksHint}
            </p>
          </div>
        )}

        {/* Popover: Camera Bookmarks */}
        {popover === 'bookmarks' && (
          <div className="hud-surface absolute right-0 top-12 w-64 p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{ui.bookmarksHeader}</span>
              <button
                type="button"
                onClick={handleSaveBookmark}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
                style={{
                  background: 'var(--hud-pill-active-bg)',
                  color: 'var(--hud-pill-active-text)',
                }}
              >
                <Plus className="w-3 h-3" />
                {ui.saveCurrentCam}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs"
                  style={{ background: 'var(--hud-bg-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      flyCameraTo(bm.mode, bm.position, bm.target)
                      setPopover(null)
                    }}
                    className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
                    style={{ color: 'var(--hud-text)' }}
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--hud-text-muted)' }} />
                    <span className="truncate">
                      {bm.id === 'bm_overview' ? ui.overviewBookmark : bm.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBookmark(bm.id)}
                    className="p-1 rounded cursor-pointer opacity-70 hover:opacity-100"
                    style={{ color: 'var(--hud-text-muted)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popover: Export HTML + HD Board PNG */}
        {popover === 'export' && (
          <div className="hud-surface absolute right-0 top-12 w-76 p-4 rounded-2xl flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold">{ui.exportHtmlTitle}</div>
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--hud-text-muted)' }}>
                {ui.exportHtmlDesc}
              </p>
              <button
                type="button"
                onClick={handleExportHtml}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'var(--hud-action-bg)',
                  color: 'var(--hud-action-text)',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{ui.exportHtmlBtn}</span>
              </button>
            </div>

            <div className="pt-3 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--hud-border)' }}>
              <div className="text-xs font-semibold">{ui.exportPngTitle}</div>
              <div className="grid grid-cols-4 gap-1">
                {(['16:9', '3:2', '4:5', 'current'] as const).map((a) => {
                  const active = pngAspect === a
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPngAspect(a)}
                      className="py-1 rounded-md text-xs cursor-pointer"
                      style={{
                        background: active ? 'var(--hud-pill-active-bg)' : 'var(--hud-bg-subtle)',
                        color: active ? 'var(--hud-pill-active-text)' : 'var(--hud-text-secondary)',
                        border: active
                          ? '1px solid var(--hud-pill-active-border)'
                          : '1px solid var(--hud-border)',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {a === 'current' ? ui.aspectCurrent : a}
                    </button>
                  )
                })}
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--hud-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={pngTransparent}
                  onChange={(e) => setPngTransparent(e.target.checked)}
                  className="accent-[var(--hud-action-bg)]"
                />
                <span>{ui.transparentBg}</span>
              </label>

              <button
                type="button"
                onClick={handleExportPng}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'var(--hud-bg-subtle)',
                  color: 'var(--hud-text)',
                  border: '1px solid var(--hud-border)',
                }}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{ui.exportPngBtn}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
