import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { instantiateImportedAsset } from '../importer/modelImporter'
import { attachPointerController } from '../interaction/pointerController'
import { createSlicerGizmo, type HandleKind } from '../interaction/slicerGizmo'
import { buildProceduralObject } from '../procedural/landscapeBuilders'
import { buildBaseGroup } from '../procedural/streetBuilders'
import { useSceneStore } from '../store/useSceneStore'
import { getBaseMode, getObjectEuler, type CameraMode, type SceneObject } from '../types/scene'
import { AmbienceAudioEngine } from './audioEngine'
import { createCelRainSystem, createCelSkyDome } from './atmosphereEffects'
import { createCelMaterialBank, disposeObjectSubtree, getBankMaterialSet } from './celMaterials'
import { WEATHER_PRESETS } from './weatherPresets'

export interface SceneCanvasHandle {
  captureBoardPng: (opts: { aspect: 'current' | '16:9' | '3:2' | '4:5'; transparent: boolean }) => void
  getCameraSnapshot: () => {
    mode: CameraMode
    position: [number, number, number]
    target: [number, number, number]
  }
}

export const SceneCanvas = forwardRef<SceneCanvasHandle>(function SceneCanvas(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const captureFnRef = useRef<SceneCanvasHandle['captureBoardPng'] | null>(null)
  const camSnapFnRef = useRef<SceneCanvasHandle['getCameraSnapshot'] | null>(null)

  useImperativeHandle(ref, () => ({
    captureBoardPng: (opts) => captureFnRef.current?.(opts),
    getCameraSnapshot: () =>
      camSnapFnRef.current?.() ?? {
        mode: 'orbit',
        position: [44, 34, 48],
        target: [0, 3, 0],
      },
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const initState = useSceneStore.getState()
    let currentWeather = WEATHER_PRESETS[initState.weather]

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const fog = new THREE.Fog(currentWeather.fogColor, currentWeather.fogNear, currentWeather.fogFar)
    scene.fog = fog

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.25,
      3800,
    )
    camera.position.set(44, 34, 48)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2 - 0.03
    controls.minDistance = 5
    controls.maxDistance = 1500
    controls.target.set(0, 3, 2)
    controls.update()

    const bank = createCelMaterialBank(currentWeather)
    const bankMatSet = getBankMaterialSet(bank)

    const sky = createCelSkyDome(currentWeather)
    scene.add(sky.mesh)
    const rain = createCelRainSystem()
    scene.add(rain.lines)

    const hemi = new THREE.HemisphereLight(
      currentWeather.hemiSky,
      currentWeather.hemiGround,
      currentWeather.hemiIntensity,
    )
    scene.add(hemi)

    const sun = new THREE.DirectionalLight(currentWeather.sunColor, currentWeather.sunIntensity)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 2
    sun.shadow.camera.far = 1600
    sun.shadow.bias = -0.0005
    scene.add(sun)
    scene.add(sun.target)

    const updateSun = () => {
      const s = useSceneStore.getState()
      const w = WEATHER_PRESETS[s.weather]
      const ox = s.base.offsetX ?? 0
      const oz = s.base.offsetZ ?? 0
      const maxSpan = Math.max(s.base.width, s.base.depth)
      const az = (s.sunAngle * Math.PI) / 180
      const el = (w.sunElevationDeg * Math.PI) / 180
      const dir = new THREE.Vector3(
        Math.cos(el) * Math.cos(az),
        Math.sin(el),
        Math.cos(el) * Math.sin(az),
      )
      const dist = Math.max(100, maxSpan * 0.9)
      sun.target.position.set(ox, 0, oz)
      sun.position.set(ox, 0, oz).addScaledVector(dir, dist)
      const ext = Math.min(580, Math.max(45, maxSpan * 0.72))
      sun.shadow.camera.left = -ext
      sun.shadow.camera.right = ext
      sun.shadow.camera.top = ext
      sun.shadow.camera.bottom = -ext
      sun.shadow.camera.far = dist * 2.4 + 200
      sun.shadow.camera.updateProjectionMatrix()
      sky.update(w, dir)
    }

    let gridHelper: THREE.GridHelper | null = null
    const rebuildGrid = () => {
      if (gridHelper) {
        scene.remove(gridHelper)
        gridHelper.geometry.dispose()
      }
      const { base, weather } = useSceneStore.getState()
      const span = Math.max(base.width, base.depth)
      // Adaptive grid cell pitch so 1km maps stay clean and legible without grey moire
      const cellSize = span > 500 ? 20 : span > 220 ? 10 : span > 100 ? 4 : 2
      const divs = Math.max(10, Math.min(100, Math.round(span / cellSize)))
      const wCfg = WEATHER_PRESETS[weather]
      gridHelper = new THREE.GridHelper(
        span,
        divs,
        wCfg.hudTheme === 'night' ? '#4f6287' : '#b8b1a0',
        wCfg.hudTheme === 'night' ? '#364463' : '#d6d1c3',
      )
      gridHelper.position.set(base.offsetX ?? 0, 0.025, base.offsetZ ?? 0)
      const mats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material]
      mats.forEach((m) => {
        m.transparent = true
        m.opacity = 0.2
        m.depthWrite = false
      })
      gridHelper.raycast = () => {}
      scene.add(gridHelper)
    }

    let baseMeshGroup: THREE.Group | null = null
    const objectsRoot = new THREE.Group()
    scene.add(objectsRoot)
    const objectMeshMap = new Map<string, { group: THREE.Group; sig: string }>()

    const gizmo = createSlicerGizmo()
    scene.add(gizmo.group)
    scene.add(gizmo.multiBoxGroup)
    scene.add(gizmo.groupScaleGroup)
    scene.add(gizmo.baseGroup)
    scene.add(gizmo.guideGroup)

    const audio = new AmbienceAudioEngine()

    const syncBaseMesh = () => {
      const s = useSceneStore.getState()
      if (baseMeshGroup) {
        scene.remove(baseMeshGroup)
        disposeObjectSubtree(baseMeshGroup, bankMatSet)
      }
      baseMeshGroup = buildBaseGroup(s.base, s.objects, bank)
      scene.add(baseMeshGroup)
      rebuildGrid()
    }

    let buildSerial = 0
    const syncObjectsMeshes = () => {
      const s = useSceneStore.getState()
      const w = WEATHER_PRESETS[s.weather]
      const liveIds = new Set(s.objects.map((o) => o.id))

      for (const [id, entry] of objectMeshMap.entries()) {
        if (!liveIds.has(id)) {
          objectsRoot.remove(entry.group)
          disposeObjectSubtree(entry.group, bankMatSet)
          objectMeshMap.delete(id)
        }
      }

      const importedMap = new Map(s.importedAssets.map((a) => [a.id, a]))
      const localSerial = ++buildSerial

      for (const obj of s.objects) {
        const sig = `${obj.kind}|${obj.size.join(',')}|${obj.litWindows ? 1 : 0}|${obj.celMode ?? ''}|${w.windowGlowStrength > 0.15 ? 1 : 0}`
        const [rx, ry, rz] = getObjectEuler(obj)
        const existing = objectMeshMap.get(obj.id)
        if (existing && existing.sig === sig) {
          existing.group.position.set(...obj.position)
          existing.group.rotation.set(rx, ry, rz)
          continue
        }
        if (existing) {
          objectsRoot.remove(existing.group)
          disposeObjectSubtree(existing.group, bankMatSet)
          objectMeshMap.delete(obj.id)
        }

        if (obj.kind === 'imported' && obj.importedAssetId && importedMap.has(obj.importedAssetId)) {
          const asset = importedMap.get(obj.importedAssetId)!
          const placeholder = new THREE.Group()
          placeholder.position.set(...obj.position)
          placeholder.rotation.set(rx, ry, rz)
          placeholder.userData.objectId = obj.id
          objectsRoot.add(placeholder)
          objectMeshMap.set(obj.id, { group: placeholder, sig })

          void instantiateImportedAsset(asset, obj.size, obj.celMode ?? 'white', bank).then((built) => {
            if (localSerial !== buildSerial && !useSceneStore.getState().objects.some((o) => o.id === obj.id)) {
              disposeObjectSubtree(built, bankMatSet)
              return
            }
            const cur = objectMeshMap.get(obj.id)
            if (!cur || cur.group !== placeholder) {
              disposeObjectSubtree(built, bankMatSet)
              return
            }
            built.traverse((c) => {
              c.userData.objectId = obj.id
            })
            placeholder.add(built)
          })
        } else {
          const built = buildProceduralObject(obj, bank, w)
          built.position.set(...obj.position)
          built.rotation.set(rx, ry, rz)
          built.userData.objectId = obj.id
          built.traverse((c) => {
            c.userData.objectId = obj.id
          })
          objectsRoot.add(built)
          objectMeshMap.set(obj.id, { group: built, sig })
        }
      }
    }

    let hoveredHandle: HandleKind | null = null
    const syncGizmos = () => {
      const s = useSceneStore.getState()
      const isOrbit = s.cameraMode === 'orbit'
      const selSet = new Set(s.selectedIds)
      const selObjs = isOrbit && selSet.size > 0 ? s.objects.filter((o) => selSet.has(o.id)) : []
      const primary =
        isOrbit && s.selectedId
          ? s.objects.find((o) => o.id === s.selectedId) ?? selObjs[0] ?? null
          : selObjs[0] ?? null
      const isMultiScale = selObjs.length > 1 && s.transformMode === 'scale'
      if (isMultiScale) {
        gizmo.syncObject(null, 'scale', camera.position, hoveredHandle)
        gizmo.syncMultiSelection(selObjs, null)
        gizmo.syncGroupScale(selObjs, true, camera.position, hoveredHandle)
      } else {
        const activeMode = selObjs.length > 1 ? 'move' : s.transformMode
        gizmo.syncObject(primary, activeMode, camera.position, hoveredHandle)
        gizmo.syncMultiSelection(selObjs, primary?.id ?? null)
        gizmo.syncGroupScale([], false, camera.position, hoveredHandle)
      }
      gizmo.syncBase(s.base, isOrbit && s.editingBase, hoveredHandle)
    }

    const applyWeatherFull = () => {
      const s = useSceneStore.getState()
      currentWeather = WEATHER_PRESETS[s.weather]
      document.documentElement.dataset.hudTheme = currentWeather.hudTheme
      bank.updateWeather(currentWeather)
      fog.color.set(currentWeather.fogColor)
      scene.fog = fog
      hemi.color.set(currentWeather.hemiSky)
      hemi.groundColor.set(currentWeather.hemiGround)
      hemi.intensity = currentWeather.hemiIntensity
      sun.color.set(currentWeather.sunColor)
      sun.intensity = currentWeather.sunIntensity
      rain.setVisible(currentWeather.rainEnabled)
      audio.setWeather(s.weather)
      updateSun()
      rebuildGrid()
      syncObjectsMeshes()
    }

    let flyState: {
      startPos: THREE.Vector3
      endPos: THREE.Vector3
      startTarget: THREE.Vector3
      endTarget: THREE.Vector3
      t: number
    } | null = null
    let walkYaw = 0
    let walkPitch = 0
    const pressedKeys = new Set<string>()

    const startCameraFly = (
      mode: CameraMode,
      endPosArr: [number, number, number],
      endTargetArr: [number, number, number],
    ) => {
      controls.enabled = mode === 'orbit'
      const endPos = new THREE.Vector3(...endPosArr)
      const endTarget = new THREE.Vector3(...endTargetArr)
      flyState = {
        startPos: camera.position.clone(),
        endPos,
        startTarget: controls.target.clone(),
        endTarget,
        t: 0,
      }
      if (mode === 'walk') {
        const dir = endTarget.clone().sub(endPos).normalize()
        walkYaw = Math.atan2(-dir.x, -dir.z)
        walkPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.75, 0.75))
      }
    }

    const pointerCtrl = attachPointerController({
      dom: renderer.domElement,
      camera,
      controls,
      objectsRoot,
      gizmo,
      audio,
      onHoverChange: (h) => {
        hoveredHandle = h
        syncGizmos()
      },
      onWalkLookDelta: (dx, dy) => {
        walkYaw -= dx * 0.0042
        walkPitch = THREE.MathUtils.clamp(walkPitch - dy * 0.0036, -0.75, 0.75)
      },
      onKeySetChange: (code, down) => {
        if (down) pressedKeys.add(code)
        else pressedKeys.delete(code)
      },
    })

    const getWaterSig = (objs: SceneObject[]) =>
      objs
        .filter((o) => o.kind === 'water')
        .map((o) => `${o.id}:${o.position.join(',')}:${o.size.join(',')}:${o.rotationY}`)
        .join('|')

    let prevWeather = initState.weather
    let prevSun = initState.sunAngle
    let prevAudio = initState.audioEnabled
    let prevBaseKey = JSON.stringify(initState.base)
    let prevWaterSig = getWaterSig(initState.objects)
    let prevCamMode = initState.cameraMode

    const unsub = useSceneStore.subscribe((s) => {
      if (s.weather !== prevWeather) {
        prevWeather = s.weather
        applyWeatherFull()
      }
      if (s.sunAngle !== prevSun) {
        prevSun = s.sunAngle
        updateSun()
      }
      if (s.audioEnabled !== prevAudio) {
        prevAudio = s.audioEnabled
        audio.setEnabled(s.audioEnabled)
      }
      const bKey = JSON.stringify(s.base)
      const wSig = getWaterSig(s.objects)
      if (bKey !== prevBaseKey || wSig !== prevWaterSig) {
        prevBaseKey = bKey
        prevWaterSig = wSig
        syncBaseMesh()
        updateSun()
      }
      if (s.pendingCameraTarget) {
        const { mode, position, target } = s.pendingCameraTarget
        prevCamMode = mode
        startCameraFly(mode, position, target)
        s.clearPendingCamera()
      } else if (s.cameraMode !== prevCamMode) {
        prevCamMode = s.cameraMode
        if (s.cameraMode === 'walk') {
          startCameraFly('walk', [0, 1.65, Math.min(20, s.base.depth * 0.35)], [0, 2.0, -10])
        } else {
          startCameraFly('orbit', [44, 34, 48], [0, 3, 2])
        }
      }
      syncObjectsMeshes()
      syncGizmos()
    })

    applyWeatherFull()
    syncBaseMesh()
    syncObjectsMeshes()
    syncGizmos()

    captureFnRef.current = ({ aspect, transparent }) => {
      const prevGizmoVis = gizmo.group.visible
      const prevMultiVis = gizmo.multiBoxGroup.visible
      const prevGroupScaleVis = gizmo.groupScaleGroup.visible
      const prevBaseGizmoVis = gizmo.baseGroup.visible
      const prevGridVis = gridHelper ? gridHelper.visible : false
      const prevSkyVis = sky.mesh.visible
      const prevFog = scene.fog

      gizmo.group.visible = false
      gizmo.multiBoxGroup.visible = false
      gizmo.groupScaleGroup.visible = false
      gizmo.baseGroup.visible = false
      if (gridHelper) gridHelper.visible = false
      if (transparent) {
        sky.mesh.visible = false
        scene.fog = null
        renderer.setClearColor(0x000000, 0)
      }

      const oldW = container.clientWidth
      const oldH = container.clientHeight
      let outW = oldW * 2
      let outH = oldH * 2
      if (aspect === '16:9') {
        outW = 2560
        outH = 1440
      } else if (aspect === '3:2') {
        outW = 2400
        outH = 1600
      } else if (aspect === '4:5') {
        outW = 1600
        outH = 2000
      }

      renderer.setPixelRatio(1)
      renderer.setSize(outW, outH, false)
      camera.aspect = outW / outH
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)

      const a = document.createElement('a')
      a.href = renderer.domElement.toDataURL('image/png')
      a.download = `atmosphere-board-${aspect.replace(':', 'x')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(oldW, oldH)
      camera.aspect = oldW / Math.max(1, oldH)
      camera.updateProjectionMatrix()
      gizmo.group.visible = prevGizmoVis
      gizmo.multiBoxGroup.visible = prevMultiVis
      gizmo.groupScaleGroup.visible = prevGroupScaleVis
      gizmo.baseGroup.visible = prevBaseGizmoVis
      if (gridHelper) gridHelper.visible = prevGridVis
      sky.mesh.visible = prevSkyVis
      scene.fog = prevFog
    }

    camSnapFnRef.current = () => {
      const mode = useSceneStore.getState().cameraMode
      let targetVec = controls.target.clone()
      if (mode === 'walk') {
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        targetVec = camera.position.clone().addScaledVector(fwd, 12)
      }
      return {
        mode,
        position: [
          Number(camera.position.x.toFixed(2)),
          Number(camera.position.y.toFixed(2)),
          Number(camera.position.z.toFixed(2)),
        ],
        target: [
          Number(targetVec.x.toFixed(2)),
          Number(targetVec.y.toFixed(2)),
          Number(targetVec.z.toFixed(2)),
        ],
      }
    }

    const resizeObs = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = Math.max(1, container.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    resizeObs.observe(container)

    let rafId = 0
    const clock = new THREE.Clock()
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta())
      const elapsed = clock.elapsedTime
      const s = useSceneStore.getState()

      if (gridHelper) {
        gridHelper.visible =
          s.cameraMode === 'orbit' &&
          (s.editingBase || (getBaseMode(s.base) !== 'none' && (s.snapEnabled || pointerCtrl.isDragging())))
      }

      if (flyState) {
        flyState.t = Math.min(1, flyState.t + dt * 2.0)
        const ease = 1 - Math.pow(1 - flyState.t, 3)
        camera.position.lerpVectors(flyState.startPos, flyState.endPos, ease)
        controls.target.lerpVectors(flyState.startTarget, flyState.endTarget, ease)
        camera.lookAt(controls.target)
        if (flyState.t >= 1) flyState = null
      } else if (s.cameraMode === 'orbit') {
        controls.update()
      } else {
        const euler = new THREE.Euler(walkPitch, walkYaw, 0, 'YXZ')
        camera.quaternion.setFromEuler(euler)
        const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, walkYaw, 0))
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, walkYaw, 0))
        const speed = 7.5 * dt
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) camera.position.addScaledVector(fwd, speed)
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) camera.position.addScaledVector(fwd, -speed)
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) camera.position.addScaledVector(right, speed)
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) camera.position.addScaledVector(right, -speed)
        camera.position.y = 1.65
      }

      // Dynamic camera-aware fog: zooming out on large/1km sites keeps models crisp & never washes white!
      if (scene.fog === fog) {
        if (s.cameraMode === 'walk') {
          fog.near = currentWeather.fogNear
          fog.far = currentWeather.fogFar
        } else {
          const camDist = camera.position.distanceTo(controls.target)
          const baseDiag = Math.hypot(s.base.width, s.base.depth)
          fog.near = Math.max(currentWeather.fogNear, camDist + baseDiag * 0.55)
          fog.far = Math.max(currentWeather.fogFar, fog.near + Math.max(320, baseDiag * 1.6))
        }
      }

      // Keep gizmo handle sizing responsive as the user zooms in on tiny objects or out on large buildings
      if (s.cameraMode === 'orbit' && (s.selectedId || s.selectedIds.length > 0)) {
        if (s.selectedIds.length > 1 && s.transformMode === 'scale') {
          const selSet = new Set(s.selectedIds)
          const selObjs = s.objects.filter((o) => selSet.has(o.id))
          gizmo.syncGroupScale(selObjs, true, camera.position, hoveredHandle)
        } else if (s.selectedId) {
          const sel = s.objects.find((o) => o.id === s.selectedId) ?? null
          const activeMode = s.selectedIds.length > 1 ? 'move' : s.transformMode
          gizmo.syncObject(sel, activeMode, camera.position, hoveredHandle)
        }
      }

      rain.update(dt)

      objectsRoot.traverse((child) => {
        if (child.userData.sway) {
          child.rotation.z = Math.sin(elapsed * 1.55 + child.position.x) * 0.032
          child.rotation.x = Math.cos(elapsed * 1.2 + child.position.z) * 0.022
        }
        if (child.userData.isWaterRipple && child instanceof THREE.Mesh) {
          child.visible = currentWeather.ripplesEnabled
          if (currentWeather.ripplesEnabled) {
            const cycle = ((elapsed * 0.9 + (child.userData.phase as number)) % 2.0) / 2.0
            const sc = 0.4 + cycle * 2.4
            child.scale.set(sc, 1, sc)
            ;(child.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.54
          }
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      unsub()
      pointerCtrl.dispose()
      resizeObs.disconnect()
      audio.dispose()
      sky.dispose()
      rain.dispose()
      gizmo.dispose()
      bank.dispose()
      controls.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden touch-none"
      aria-label="3D 赛璐璐白模画布"
    />
  )
})
