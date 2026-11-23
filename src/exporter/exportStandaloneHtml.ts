import { getUiStrings } from '../i18n/translations'
import type { SerializedScene } from '../types/scene'
import viewerRuntimeCode from './generated/viewer-runtime.js?raw'

/**
 * Packages the current scene + tree-shaken cel-shaded Three.js runtime into a
 * 100% offline, self-contained single .html showcase file!
 */
export function buildStandaloneHtmlString(scene: SerializedScene, title?: string): string {
  const lang = scene.language ?? 'zh-CN'
  const docTitle = title ?? getUiStrings(lang).viewerTitle
  // Escape closing script tags safely inside JSON payload
  const safeJson = JSON.stringify(scene).replace(/<\/script/gi, '<\\/script')
  const safeRuntime = viewerRuntimeCode.replace(/<\/script/gi, '<\\/script')

  return `<!doctype html>
<html lang="${lang}" data-hud-theme="${scene.weather === 'rain' ? 'night' : 'day'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  <style>
    :root {
      --bg: rgba(255, 254, 251, 0.92);
      --text: #332724;
      --muted: #60534b;
      --border: rgba(198, 194, 179, 0.78);
      --active-bg: #ebffff;
      --active-text: #123e6a;
      --active-border: #429fbb;
      --shadow: 0 2px 6px rgba(30,21,18,0.12), 0 10px 26px rgba(30,21,18,0.14);
    }
    [data-hud-theme="night"] {
      --bg: rgba(29, 32, 57, 0.9);
      --text: #f5fcff;
      --muted: #acc2ce;
      --border: rgba(105, 120, 150, 0.45);
      --active-bg: #1e5b7f;
      --active-text: #fffceb;
      --active-border: #72c9d9;
      --shadow: 0 4px 12px rgba(8,10,24,0.42);
    }
    * { box-sizing: border-box; }
    html, body, #viewport { width: 100%; height: 100%; margin: 0; overflow: hidden; font-family: system-ui, -apple-system, 'PingFang SC', sans-serif; }
    #hud {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: none; z-index: 10; max-width: calc(100vw - 24px);
    }
    .hud-pill {
      pointer-events: auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      gap: 10px; padding: 6px 10px; border-radius: 16px;
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      box-shadow: var(--shadow); backdrop-filter: blur(12px);
    }
    .group { display: flex; align-items: center; gap: 4px; }
    .sep { width: 1px; height: 18px; background: var(--border); }
    .pill-btn {
      appearance: none; border: 1px solid transparent; background: transparent; color: var(--text);
      padding: 5px 10px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
      transition: background 140ms ease, border-color 140ms ease;
    }
    .pill-btn:hover { background: rgba(128,128,128,0.12); }
    .pill-btn.active {
      background: var(--active-bg); color: var(--active-text);
      border-color: var(--active-border); font-weight: 600;
    }
    .sun-ctrl {
      display: flex; align-items: center; gap: 6px; padding: 0 4px;
      font-size: 12px; font-weight: 500; color: var(--muted); white-space: nowrap;
    }
    .sun-slider {
      width: 78px; height: 5px; accent-color: #246b8a; cursor: pointer;
    }
    .hud-hint {
      font-size: 12px; font-weight: 500; color: var(--muted);
      background: var(--bg); padding: 4px 12px; border-radius: 999px;
      border: 1px solid var(--border); opacity: 0.92;
    }
  </style>
</head>
<body>
  <div id="viewport"></div>
  <div id="hud"></div>
  <script id="atmosphere-scene-data" type="application/json">${safeJson}</script>
  <script>window.__ATMOSPHERE_SCENE__ = JSON.parse(document.getElementById('atmosphere-scene-data').textContent);</script>
  <script>${safeRuntime}</script>
</body>
</html>`
}

export function downloadStandaloneHtml(scene: SerializedScene, filename = 'atmosphere-miniature.html') {
  const html = buildStandaloneHtmlString(scene)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return blob.size
}
