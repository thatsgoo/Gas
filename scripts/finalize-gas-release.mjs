import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const releaseDir = path.join(rootDir, 'release')
const unpackedDir = path.join(releaseDir, 'win-unpacked')
const gasDir = path.join(releaseDir, 'Gas')
const savedModelsBackup = path.join(releaseDir, '.saved-models-backup')

if (!fs.existsSync(unpackedDir)) {
  console.error('Expected release/win-unpacked to exist after electron-builder!')
  process.exit(1)
}

// Preserve any user saved-models already inside release/Gas/saved-models before replacing
const prevSavedModels = path.join(gasDir, 'saved-models')
if (fs.existsSync(prevSavedModels)) {
  fs.rmSync(savedModelsBackup, { recursive: true, force: true })
  fs.cpSync(prevSavedModels, savedModelsBackup, { recursive: true })
}

if (fs.existsSync(gasDir)) {
  fs.rmSync(gasDir, { recursive: true, force: true })
}

// Move win-unpacked -> Gas so opening Gas/ goes directly into the software root directory
try {
  fs.renameSync(unpackedDir, gasDir)
} catch {
  fs.cpSync(unpackedDir, gasDir, { recursive: true })
  fs.rmSync(unpackedDir, { recursive: true, force: true })
}

// Ensure saved-models/ folder exists in Gas/ root (and restore preserved files if any)
const targetSavedModels = path.join(gasDir, 'saved-models')
fs.mkdirSync(targetSavedModels, { recursive: true })
if (fs.existsSync(savedModelsBackup)) {
  fs.cpSync(savedModelsBackup, targetSavedModels, { recursive: true })
  fs.rmSync(savedModelsBackup, { recursive: true, force: true })
}

// Clean up electron-builder temp yaml metadata files if not needed? Keep release tidy
for (const extra of ['builder-debug.yml', 'builder-effective-config.yaml']) {
  const p = path.join(releaseDir, extra)
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p)
    } catch {
      // ignore
    }
  }
}

// Notify Windows Explorer to refresh file icon cache so Gas.exe & Gas-Setup show the squircle icon immediately
if (process.platform === 'win32') {
  try {
    execSync(
      `powershell -NoProfile -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ShellRefresh { [DllImport(\\"shell32.dll\\")] public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2); }'; [ShellRefresh]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)"`,
      { stdio: 'ignore' },
    )
  } catch {
    // non-fatal
  }
}

console.log('✓ Gas release finalized:')
console.log('  - Portable root folder:', gasDir)
console.log('  - Saved models folder :', targetSavedModels)
