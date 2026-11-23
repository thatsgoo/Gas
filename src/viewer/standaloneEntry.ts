import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AmbienceAudioEngine } from '../engine/audioEngine'
import { createCelRainSystem, createCelSkyDome } from '../engine/atmosphereEffects'
import { createCelMaterialBank } from '../engine/celMaterials'
import { WEATHER_LIST, WEATHER_PRESETS } from '../engine/weatherPresets'
import { getUiStrings, WEATHER_I18N } from '../i18n/translations'
import { instantiateImportedAsset } from '../importer/modelImporter'
import { buildProceduralObject } from '../procedural/landscapeBuilders'
import { buildBaseGroup } from '../procedural/streetBuilders'
import { getObjectEuler, type CameraMode, type SerializedScene, type WeatherPreset } from '../types/scene'

declare global {
  interface Window {
    __ATMOSPHERE_SCENE__?: SerializedScene
  }
}

function mountStandaloneViewer() {
  const data = window.__ATMOSPHERE_SCENE__
  if (!data) return

  const mountEl = document.getElementById('viewport')
  if (!mountEl) return

  let weatherId: WeatherPreset = data.weather
  let weather = WEATHER_PRESETS[weatherId]
  let sunAngle = typeof data.sunAngle === 'number' ? data.sunAngle : 42
  let cameraMode: CameraMode = 'orbit'
  let audioOn = false
  const lang = data.language ?? 'zh-CN'
  const ui = getUiStrings(lang)
  const weatherI18n = WEATHER_I18N[lang]
  const visibleBookmarks = (data.bookmarks ?? []).filter((b) => b.id !== 'bm_corridor')

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  mountEl.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const fog = new THREE.Fog(weather.fogColor, weather.fogNear, weather.fogFar)
  scene.fog = fog

  const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.25, 3800)
  const firstBm = data.bookmarks[0]
  if (firstBm) {
    camera.position.set(...firstBm.position)
  } else {
    camera.position.set(44, 34, 48)
  }

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI / 2 - 0.03
  controls.minDistance = 5
  controls.maxDistance = 1500
  if (firstBm) {
    controls.target.set(...firstBm.target)
  } else {
    controls.target.set(data.base.offsetX ?? 0, 3, data.base.offsetZ ?? 0)
  }
  controls.update()

  const bank = createCelMaterialBank(weather)
  const sky = createCelSkyDome(weather)
  scene.add(sky.mesh)

  const rain = createCelRainSystem()
  scene.add(rain.lines)

  const hemi = new THREE.HemisphereLight(weather.hemiSky, weather.hemiGround, weather.hemiIntensity)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(weather.sunColor, weather.sunIntensity)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const maxSpan = Math.max(data.base.width, data.base.depth)
  const shadowExtent = Math.min(580, Math.max(45, maxSpan * 0.72))
  sun.shadow.camera.left = -shadowExtent
  sun.shadow.camera.right = shadowExtent
  sun.shadow.camera.top = shadowExtent
  sun.shadow.camera.bottom = -shadowExtent
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 1600
  sun.shadow.bias = -0.0005
  scene.add(sun)
  scene.add(sun.target)

  const updateSun = () => {
    const ox = data.base.offsetX ?? 0
    const oz = data.base.offsetZ ?? 0
    const az = (sunAngle * Math.PI) / 180
    const el = (weather.sunElevationDeg * Math.PI) / 180
    const dist = Math.max(100, maxSpan * 0.9)
    const dir = new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    )
    sun.target.position.set(ox, 0, oz)
    sun.position.set(ox, 0, oz).addScaledVector(dir, dist)
    sky.update(weather, dir)
  }

  const audio = new AmbienceAudioEngine()

  const contentRoot = new THREE.Group()
  scene.add(contentRoot)

  const importedMap = new Map(data.importedAssets.map((a) => [a.id, a]))

  const rebuildScene = async () => {
    while (contentRoot.children.length > 0) {
      contentRoot.remove(contentRoot.children[0])
    }
    const baseGroup = buildBaseGroup(data.base, data.objects, bank)
    contentRoot.add(baseGroup)

    for (const obj of data.objects) {
      let meshGroup: THREE.Group
      if (obj.kind === 'imported' && obj.importedAssetId && importedMap.has(obj.importedAssetId)) {
        meshGroup = await instantiateImportedAsset(
          importedMap.get(obj.importedAssetId)!,
          obj.size,
          obj.celMode ?? 'white',
          bank,
        )
      } else {
        meshGroup = buildProceduralObject(obj, bank, weather)
      }
      meshGroup.position.set(...obj.position)
      const [rx, ry, rz] = getObjectEuler(obj)
      meshGroup.rotation.set(rx, ry, rz)
      contentRoot.add(meshGroup)
    }
  }

  const applyWeather = (id: WeatherPreset) => {
    weatherId = id
    weather = WEATHER_PRESETS[id]
    document.documentElement.dataset.hudTheme = weather.hudTheme
    bank.updateWeather(weather)
    fog.color.set(weather.fogColor)
    scene.fog = fog
    hemi.color.set(weather.hemiSky)
    hemi.groundColor.set(weather.hemiGround)
    hemi.intensity = weather.hemiIntensity
    sun.color.set(weather.sunColor)
    sun.intensity = weather.sunIntensity
    rain.setVisible(weather.rainEnabled)
    audio.setWeather(id)
    updateSun()
    void rebuildScene()
    renderHud()
  }

  // Smooth fly-to state
  let flyState: {
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    t: number
  } | null = null

  let walkYaw = 0
  let walkPitch = 0
  const keys = new Set<string>()
  let looking = false
  let lastPointer = { x: 0, y: 0 }

  const startFly = (mode: CameraMode, pos: [number, number, number], target: [number, number, number]) => {
    cameraMode = mode
    controls.enabled = mode === 'orbit'
    const endPos = new THREE.Vector3(...pos)
    const endTarget = new THREE.Vector3(...target)
    flyState = {
      startPos: camera.position.clone(),
      endPos,
      startTarget: controls.target.clone(),
      endTarget,
      t: 0,
    }
    if (mode === 'walk') {
      const lookDir = endTarget.clone().sub(endPos).normalize()
      walkYaw = Math.atan2(-lookDir.x, -lookDir.z)
      walkPitch = Math.asin(THREE.MathUtils.clamp(lookDir.y, -0.75, 0.75))
    }
    renderHud()
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (cameraMode !== 'walk') return
    looking = true
    lastPointer = { x: e.clientX, y: e.clientY }
  })
  window.addEventListener('pointermove', (e) => {
    if (!looking || cameraMode !== 'walk') return
    const dx = e.clientX - lastPointer.x
    const dy = e.clientY - lastPointer.y
    lastPointer = { x: e.clientX, y: e.clientY }
    walkYaw -= dx * 0.0042
    walkPitch = THREE.MathUtils.clamp(walkPitch - dy * 0.0036, -0.75, 0.75)
  })
  window.addEventListener('pointerup', () => {
    looking = false
  })
  window.addEventListener('keydown', (e) => {
    keys.add(e.code)
    if (e.code === 'Escape' && cameraMode === 'walk') {
      startFly('orbit', [44, 34, 48], [0, 3, 0])
    }
  })
  window.addEventListener('keyup', (e) => keys.delete(e.code))

  // Minimal Zero-UI Corner HUD (with Sun Azimuth Slider + 4-Language Sync)
  const hud = document.getElementById('hud')
  const renderHud = () => {
    if (!hud) return
    const weatherButtons = WEATHER_LIST.map(
      (w) =>
        `<button data-weather="${w.id}" class="pill-btn ${w.id === weatherId ? 'active' : ''}">${weatherI18n[w.id].short}</button>`,
    ).join('')

    const bmButtons = visibleBookmarks
      .map(
        (bm, idx) =>
          `<button data-bm="${idx}" class="pill-btn">${bm.id === 'bm_overview' ? ui.overviewBookmark : bm.name}</button>`,
      )
      .join('')

    hud.innerHTML = `
      <div class="hud-pill">
        <div class="group">${weatherButtons}</div>
        <span class="sep"></span>
        <label class="sun-ctrl" title="${ui.sunAngleTitle}">
          <span class="sun-label">☀ ${ui.viewerSunLabel}</span>
          <input id="sun-slider" class="sun-slider" type="range" min="0" max="360" value="${Math.round(sunAngle)}" />
        </label>
        <span class="sep"></span>
        <div class="group">
          <button id="btn-cam" class="pill-btn ${cameraMode === 'walk' ? 'active' : ''}">
            ${cameraMode === 'walk' ? ui.viewerReturnOrbit : ui.viewerWalk}
          </button>
          <button id="btn-audio" class="pill-btn ${audioOn ? 'active' : ''}">
            ${audioOn ? ui.viewerAudioOn : ui.viewerAudioOff}
          </button>
        </div>
        ${bmButtons ? `<span class="sep"></span><div class="group">${bmButtons}</div>` : ''}
      </div>
      <div class="hud-hint">${cameraMode === 'walk' ? ui.viewerHintWalk : ui.viewerHintOrbit}</div>
    `

    hud.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach((btn) => {
      btn.onclick = () => applyWeather(btn.dataset.weather as WeatherPreset)
    })
    const sunSlider = document.getElementById('sun-slider') as HTMLInputElement | null
    if (sunSlider) {
      sunSlider.oninput = () => {
        sunAngle = Number(sunSlider.value)
        updateSun()
      }
    }
    hud.querySelectorAll<HTMLButtonElement>('[data-bm]').forEach((btn) => {
      btn.onclick = () => {
        const bm = visibleBookmarks[Number(btn.dataset.bm)]
        if (bm) startFly(bm.mode, bm.position, bm.target)
      }
    })
    const camBtn = document.getElementById('btn-cam')
    if (camBtn) {
      camBtn.onclick = () => {
        if (cameraMode === 'walk') {
          startFly('orbit', [44, 34, 48], [0, 3, 0])
        } else {
          startFly('walk', [0, 1.65, Math.min(20, data.base.depth * 0.35)], [0, 2.0, -10])
        }
      }
    }
    const audioBtn = document.getElementById('btn-audio')
    if (audioBtn) {
      audioBtn.onclick = () => {
        audioOn = !audioOn
        audio.setEnabled(audioOn)
        renderHud()
      }
    }
  }

  applyWeather(weatherId)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  const clock = new THREE.Clock()
  const animate = () => {
    requestAnimationFrame(animate)
    const dt = Math.min(0.05, clock.getDelta())
    const elapsed = clock.elapsedTime

    if (flyState) {
      flyState.t = Math.min(1, flyState.t + dt * 1.9)
      const ease = 1 - Math.pow(1 - flyState.t, 3)
      camera.position.lerpVectors(flyState.startPos, flyState.endPos, ease)
      controls.target.lerpVectors(flyState.startTarget, flyState.endTarget, ease)
      camera.lookAt(controls.target)
      if (flyState.t >= 1) flyState = null
    } else if (cameraMode === 'orbit') {
      controls.update()
    } else {
      const euler = new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ')
      camera.quaternion.setFromEuler(euler)
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, walkYaw, 0))
      const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, walkYaw, 0))
      const speed = 7.5 * dt
      if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.addScaledVector(fwd, speed)
      if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.addScaledVector(fwd, -speed)
      if (keys.has('KeyD') || keys.has('ArrowRight')) camera.position.addScaledVector(right, speed)
      if (keys.has('KeyA') || keys.has('ArrowLeft')) camera.position.addScaledVector(right, -speed)
      camera.position.y = 1.65
    }

    // Dynamic camera-aware fog so zooming out on large/1km models stays crisp!
    if (cameraMode === 'walk') {
      fog.near = weather.fogNear
      fog.far = weather.fogFar
    } else {
      const camDist = camera.position.distanceTo(controls.target)
      const baseDiag = Math.hypot(data.base.width, data.base.depth)
      fog.near = Math.max(weather.fogNear, camDist + baseDiag * 0.55)
      fog.far = Math.max(weather.fogFar, fog.near + Math.max(320, baseDiag * 1.6))
    }

    rain.update(dt)

    // Tree canopy breeze & rain ripples
    contentRoot.traverse((child) => {
      if (child.userData.sway) {
        child.rotation.z = Math.sin(elapsed * 1.6 + child.position.x) * 0.032
        child.rotation.x = Math.cos(elapsed * 1.2 + child.position.z) * 0.022
      }
      if (child.userData.isWaterRipple && child instanceof THREE.Mesh) {
        child.visible = weather.ripplesEnabled
        if (weather.ripplesEnabled) {
          const cycle = ((elapsed * 0.9 + (child.userData.phase as number)) % 2.0) / 2.0
          const s = 0.4 + cycle * 2.4
          child.scale.set(s, 1, s)
          ;(child.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.52
        }
      }
    })

    renderer.render(scene, camera)
  }
  animate()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountStandaloneViewer)
} else {
  mountStandaloneViewer()
}
