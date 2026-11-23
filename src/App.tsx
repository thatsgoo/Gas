import { useEffect, useRef } from 'react'
import { Eye } from 'lucide-react'
import { SceneCanvas, type SceneCanvasHandle } from './engine/SceneCanvas'
import { getUiStrings } from './i18n/translations'
import { useSceneStore } from './store/useSceneStore'
import { AssetDock } from './ui/AssetDock'
import { HtmlImportModal } from './ui/HtmlImportModal'
import { SelectionCapsule } from './ui/SelectionCapsule'
import { TopBar } from './ui/TopBar'

export function App() {
  const canvasRef = useRef<SceneCanvasHandle | null>(null)
  const language = useSceneStore((s) => s.language)
  const cameraMode = useSceneStore((s) => s.cameraMode)
  const setCameraMode = useSceneStore((s) => s.setCameraMode)
  const toastMessage = useSceneStore((s) => s.toastMessage)
  const selectedId = useSceneStore((s) => s.selectedId)
  const editingBase = useSceneStore((s) => s.editingBase)
  const loadSavedLibrary = useSceneStore((s) => s.loadSavedLibrary)
  const ui = getUiStrings(language)

  useEffect(() => {
    void loadSavedLibrary()
  }, [loadSavedLibrary])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <main className="relative w-full h-full overflow-hidden">
      {/* 100% Full-Bleed Cel-Shaded 3D Canvas */}
      <SceneCanvas ref={canvasRef} />

      {/* Minimal Floating Top Corner Controls */}
      <TopBar canvasRef={canvasRef} />

      {/* External AI-generated Three.js HTML Import Confirmation Modal */}
      <HtmlImportModal />

      {/* Unified Bottom Stack: SelectionCapsule automatically rises above open AssetDock (zero overlap) */}
      {cameraMode === 'orbit' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 pointer-events-none max-w-[calc(100vw-24px)]">
          <SelectionCapsule />
          <AssetDock />
        </div>
      )}

      {/* Subtle First-Person Walkthrough Return Pill */}
      {cameraMode === 'walk' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="hud-surface flex items-center gap-3 px-4 py-2 rounded-full text-xs">
            <span style={{ color: 'var(--hud-text-secondary)' }}>{ui.walkBarText}</span>
            <button
              type="button"
              onClick={() => setCameraMode('orbit')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold cursor-pointer whitespace-nowrap"
              style={{
                background: 'var(--hud-pill-active-bg)',
                color: 'var(--hud-pill-active-text)',
                border: '1px solid var(--hud-pill-active-border)',
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{ui.returnOrbitBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtle Bottom-Left Contextual Hint (disappears when anything is selected) */}
      {cameraMode === 'orbit' && !selectedId && !editingBase && (
        <div
          className="fixed bottom-4 left-4 z-10 hidden xl:block px-3 py-1.5 rounded-full text-[11px] pointer-events-none"
          style={{
            background: 'var(--hud-bg)',
            color: 'var(--hud-text-muted)',
            border: '1px solid var(--hud-border)',
          }}
        >
          {ui.shortcutHint}
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="hud-surface px-4 py-2 rounded-full text-xs font-semibold"
            style={{ color: 'var(--hud-text)' }}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
