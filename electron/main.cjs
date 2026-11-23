const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')

// Keep hardware WebGL acceleration crisp for Three.js cel rendering
app.commandLine.appendSwitch('ignore-gpu-blocklist')

let mainWindow = null

/**
 * Smart saved-models/ directory resolver:
 *   1. Prefer portable <Gas-root>/saved-models/ so moving the Gas folder keeps all saved assets.
 *   2. If installed in a write-protected location (e.g. C:\Program Files\Gas), transparently fall back
 *      to %AppData%\Gas\saved-models\ so saving models never throws EPERM.
 */
let cachedSavedModelsDir = null
function isDirWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, `.probe_${process.pid}_${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
    return true
  } catch {
    return false
  }
}

function getSavedModelsDir() {
  if (cachedSavedModelsDir) return cachedSavedModelsDir
  const baseDir = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..')
  const portableDir = path.join(baseDir, 'saved-models')
  if (isDirWritable(portableDir)) {
    cachedSavedModelsDir = portableDir
    return portableDir
  }
  const fallbackDir = path.join(app.getPath('userData'), 'saved-models')
  fs.mkdirSync(fallbackDir, { recursive: true })
  cachedSavedModelsDir = fallbackDir
  return fallbackDir
}

function getSafeModelFile(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw new Error('无效的资产 ID')
  }
  return path.join(getSavedModelsDir(), `${id}.json`)
}

function registerSavedModelsIpc() {
  ipcMain.handle('saved-models:list', async () => {
    const dir = getSavedModelsDir()
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    const items = []
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.id === 'string' && typeof parsed.glbBase64 === 'string') {
          items.push(parsed)
        }
      } catch {
        // skip corrupted file gracefully
      }
    }
    items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    return items
  })

  ipcMain.handle('saved-models:save', async (_event, model) => {
    if (!model || typeof model.id !== 'string' || typeof model.glbBase64 !== 'string') {
      throw new Error('资产数据格式无效')
    }
    const target = getSafeModelFile(model.id)
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(model), 'utf-8')
    fs.renameSync(tmp, target)
    return true
  })

  ipcMain.handle('saved-models:rename', async (_event, { id, name }) => {
    const target = getSafeModelFile(id)
    if (!fs.existsSync(target)) return false
    const parsed = JSON.parse(fs.readFileSync(target, 'utf-8'))
    parsed.name = String(name || '').trim() || parsed.name
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(parsed), 'utf-8')
    fs.renameSync(tmp, target)
    return true
  })

  ipcMain.handle('saved-models:delete', async (_event, id) => {
    const target = getSafeModelFile(id)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
    }
    return true
  })

  ipcMain.handle('saved-models:open-folder', async () => {
    const dir = getSavedModelsDir()
    await shell.openPath(dir)
    return true
  })
}

function resolveWindowIcon() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(__dirname, '..', 'dist', 'icon.png'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'Gas',
    icon: resolveWindowIcon(),
    backgroundColor: '#f3efe6',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  mainWindow.loadFile(indexPath)

  const smokeArg = process.argv.find((a) => a.startsWith('--smoke-test='))
  if (smokeArg) {
    const outFile = smokeArg.slice('--smoke-test='.length)
    const errors = []
    mainWindow.webContents.on('console-message', (_e, level, msg) => {
      if (level >= 2) errors.push(msg)
    })
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      errors.push(`did-fail-load:${code}:${desc}`)
    })
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const info = await mainWindow.webContents.executeJavaScript(
            `({ title: document.title, hasCanvas: !!document.querySelector('canvas'), hasDesktopBridge: !!window.sketchpadDesktop?.isDesktop, buttons: document.querySelectorAll('button').length, rootLen: (document.getElementById('root')?.innerHTML || '').length })`,
          )
          fs.writeFileSync(outFile, JSON.stringify({ ...info, errors }, null, 2))
        } catch (err) {
          fs.writeFileSync(outFile, JSON.stringify({ error: String(err), errors }, null, 2))
        }
        app.quit()
      }, 2500)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerSavedModelsIpc()
  // Ensure portable saved-models/ folder exists right away so user sees it cleanly
  getSavedModelsDir()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
