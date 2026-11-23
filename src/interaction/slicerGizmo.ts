import * as THREE from 'three'
import { getObjectEuler, type BaseConfig, type SceneObject, type TransformMode } from '../types/scene'
import { computeGroupBounds } from './groupTransform'

export type HandleKind =
  | 'lift'
  | 'face:+x'
  | 'face:-x'
  | 'face:+y'
  | 'face:-y'
  | 'face:+z'
  | 'face:-z'
  | 'corner:++'
  | 'corner:+-'
  | 'corner:-+'
  | 'corner:--'
  | 'group-corner:++'
  | 'group-corner:+-'
  | 'group-corner:-+'
  | 'group-corner:--'
  | 'rotate:x'
  | 'rotate:y'
  | 'rotate:z'
  | 'base:+x'
  | 'base:-x'
  | 'base:+z'
  | 'base:-z'

export interface SlicerGizmoController {
  group: THREE.Group
  multiBoxGroup: THREE.Group
  groupScaleGroup: THREE.Group
  baseGroup: THREE.Group
  guideGroup: THREE.Group
  getInteractiveMeshes: (mode: TransformMode, isMulti?: boolean) => THREE.Object3D[]
  baseInteractiveMeshes: THREE.Object3D[]
  syncObject: (
    obj: SceneObject | null,
    mode: TransformMode,
    cameraPos: THREE.Vector3,
    hoveredHandle: HandleKind | null,
  ) => void
  syncMultiSelection: (objs: SceneObject[], primaryId: string | null) => void
  syncGroupScale: (
    objs: SceneObject[],
    active: boolean,
    cameraPos: THREE.Vector3,
    hoveredHandle: HandleKind | null,
  ) => void
  syncBase: (base: BaseConfig, editingBase: boolean, hoveredHandle: HandleKind | null) => void
  syncGuides: (guides: Array<{ axis: 'x' | 'z'; value: number }>, base: BaseConfig) => void
  dispose: () => void
}

const COLOR_BOX = '#246b8a'
const COLOR_LOCKED = '#d97706'
const COLOR_AXIS_X = '#d96b43'
const COLOR_AXIS_Y = '#3b9a72'
const COLOR_AXIS_Z = '#2e7ba6'
const COLOR_CORNER = '#e4ab48'
const COLOR_HOVER = '#fff3ab'
const COLOR_BASE = '#c97b24'

export function createSlicerGizmo(): SlicerGizmoController {
  const group = new THREE.Group()
  group.visible = false
  group.renderOrder = 20

  // Sub-groups per transform mode (mutually exclusive -> zero clutter on small objects!)
  const moveSubGroup = new THREE.Group()
  const rotateSubGroup = new THREE.Group()
  const scaleSubGroup = new THREE.Group()
  group.add(moveSubGroup, rotateSubGroup, scaleSubGroup)

  const baseGroup = new THREE.Group()
  baseGroup.visible = false
  baseGroup.renderOrder = 20

  const multiBoxGroup = new THREE.Group()
  multiBoxGroup.renderOrder = 19

  const groupScaleGroup = new THREE.Group()
  groupScaleGroup.visible = false
  groupScaleGroup.renderOrder = 22

  const guideGroup = new THREE.Group()
  guideGroup.renderOrder = 15

  // Shared crisp dashed bounding box wireframe (always lightweight & never obscures geometry)
  const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
  const multiBoxMat = new THREE.LineBasicMaterial({
    color: '#2b8fb3',
    depthTest: false,
    transparent: true,
    opacity: 0.78,
  })
  const groupBoxMat = new THREE.LineDashedMaterial({
    color: COLOR_CORNER,
    dashSize: 0.45,
    gapSize: 0.25,
    depthTest: false,
    transparent: true,
    opacity: 0.92,
  })
  const groupBoxLines = new THREE.LineSegments(boxGeo.clone(), groupBoxMat)
  groupBoxLines.raycast = () => {}
  groupScaleGroup.add(groupBoxLines)
  const boxMat = new THREE.LineDashedMaterial({
    color: COLOR_BOX,
    dashSize: 0.28,
    gapSize: 0.18,
    depthTest: false,
    transparent: true,
    opacity: 0.85,
  })
  const boxLines = new THREE.LineSegments(boxGeo, boxMat)
  boxLines.raycast = () => {}
  group.add(boxLines)

  const handleMap = new Map<HandleKind, { mesh: THREE.Mesh; baseColor: string }>()
  const moveMeshes: THREE.Object3D[] = []
  const rotateMeshes: THREE.Object3D[] = []
  const scaleMeshes: THREE.Object3D[] = []
  const groupScaleMeshes: THREE.Object3D[] = []

  // === 1. MOVE MODE: Sleek vertical lift arrow hovering cleanly ABOVE the object ===
  const liftStemGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8)
  const liftStemMat = new THREE.MeshBasicMaterial({
    color: COLOR_AXIS_Y,
    depthTest: false,
    transparent: true,
    opacity: 0.88,
  })
  const liftStem = new THREE.Mesh(liftStemGeo, liftStemMat)
  liftStem.raycast = () => {}
  moveSubGroup.add(liftStem)

  const liftConeGeo = new THREE.ConeGeometry(0.28, 0.56, 12)
  const liftConeMat = new THREE.MeshBasicMaterial({
    color: COLOR_AXIS_Y,
    depthTest: false,
    transparent: true,
    opacity: 0.96,
  })
  const liftCone = new THREE.Mesh(liftConeGeo, liftConeMat)
  liftCone.renderOrder = 26
  liftCone.userData.handleKind = 'lift'
  const liftRim = new THREE.LineSegments(
    new THREE.EdgesGeometry(liftConeGeo, 25),
    new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false }),
  )
  liftRim.raycast = () => {}
  liftCone.add(liftRim)
  moveSubGroup.add(liftCone)
  moveMeshes.push(liftCone)
  handleMap.set('lift', { mesh: liftCone, baseColor: COLOR_AXIS_Y })

  // === 2. ROTATE MODE: 3 thin color-coded 360° rings (X / Y / Z) ===
  const makeRotateRing = (kind: HandleKind, color: string, orient: 'x' | 'y' | 'z') => {
    // Thin visual ring (tube ratio 0.024 -> sleek and unobtrusive)
    const geo = new THREE.TorusGeometry(1, 0.028, 8, 64)
    if (orient === 'y') geo.rotateX(Math.PI / 2)
    else if (orient === 'x') geo.rotateY(Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.82,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 24
    mesh.userData.handleKind = kind
    rotateSubGroup.add(mesh)
    rotateMeshes.push(mesh)
    handleMap.set(kind, { mesh, baseColor: color })
  }

  makeRotateRing('rotate:x', COLOR_AXIS_X, 'x')
  makeRotateRing('rotate:y', COLOR_AXIS_Y, 'y')
  makeRotateRing('rotate:z', COLOR_AXIS_Z, 'z')

  // === 3. SCALE MODE: 6 slicer face-pull handles + 4 top corner spheres ===
  const makeFaceHandle = (kind: HandleKind, color: string) => {
    const geo = new THREE.BoxGeometry(0.46, 0.46, 0.46)
    const mat = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.94,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 25
    mesh.userData.handleKind = kind
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false }),
    )
    rim.raycast = () => {}
    mesh.add(rim)
    scaleSubGroup.add(mesh)
    scaleMeshes.push(mesh)
    handleMap.set(kind, { mesh, baseColor: color })
  }

  makeFaceHandle('face:+x', COLOR_AXIS_X)
  makeFaceHandle('face:-x', COLOR_AXIS_X)
  makeFaceHandle('face:+y', COLOR_AXIS_Y)
  makeFaceHandle('face:-y', COLOR_AXIS_Y)
  makeFaceHandle('face:+z', COLOR_AXIS_Z)
  makeFaceHandle('face:-z', COLOR_AXIS_Z)

  const makeCornerHandle = (kind: HandleKind) => {
    const geo = new THREE.SphereGeometry(0.26, 12, 10)
    const mat = new THREE.MeshBasicMaterial({
      color: COLOR_CORNER,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 26
    mesh.userData.handleKind = kind
    scaleSubGroup.add(mesh)
    scaleMeshes.push(mesh)
    handleMap.set(kind, { mesh, baseColor: COLOR_CORNER })
  }

  makeCornerHandle('corner:++')
  makeCornerHandle('corner:+-')
  makeCornerHandle('corner:-+')
  makeCornerHandle('corner:--')

  // === 3B. MULTI-SELECT GROUP SCALE MODE: 4 top corner spheres on shared group AABB ===
  const makeGroupCornerHandle = (kind: HandleKind) => {
    const geo = new THREE.SphereGeometry(0.32, 14, 12)
    const mat = new THREE.MeshBasicMaterial({
      color: COLOR_CORNER,
      depthTest: false,
      transparent: true,
      opacity: 0.96,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 27
    mesh.userData.handleKind = kind
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.36, 0)),
      new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 0.7 }),
    )
    rim.raycast = () => {}
    mesh.add(rim)
    groupScaleGroup.add(mesh)
    groupScaleMeshes.push(mesh)
    handleMap.set(kind, { mesh, baseColor: COLOR_CORNER })
  }

  makeGroupCornerHandle('group-corner:++')
  makeGroupCornerHandle('group-corner:+-')
  makeGroupCornerHandle('group-corner:-+')
  makeGroupCornerHandle('group-corner:--')

  // === 4. BASE STRETCH HANDLES (±X / ±Z) ===
  const baseInteractiveMeshes: THREE.Object3D[] = []
  const baseHandleMap = new Map<HandleKind, { mesh: THREE.Mesh; baseColor: string }>()
  const baseOutlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.2, 1))
  const baseOutline = new THREE.LineSegments(
    baseOutlineGeo,
    new THREE.LineBasicMaterial({ color: COLOR_BASE, depthTest: false }),
  )
  baseOutline.raycast = () => {}
  baseGroup.add(baseOutline)

  const makeBaseHandle = (kind: HandleKind) => {
    const geo = new THREE.BoxGeometry(2.6, 0.9, 1.1)
    const mat = new THREE.MeshBasicMaterial({
      color: COLOR_BASE,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 26
    mesh.userData.handleKind = kind
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: '#fffefb', depthTest: false }),
    )
    rim.raycast = () => {}
    mesh.add(rim)
    baseGroup.add(mesh)
    baseInteractiveMeshes.push(mesh)
    baseHandleMap.set(kind, { mesh, baseColor: COLOR_BASE })
  }

  makeBaseHandle('base:+x')
  makeBaseHandle('base:-x')
  makeBaseHandle('base:+z')
  makeBaseHandle('base:-z')

  const syncObject = (
    obj: SceneObject | null,
    mode: TransformMode,
    cameraPos: THREE.Vector3,
    hoveredHandle: HandleKind | null,
  ) => {
    if (!obj) {
      group.visible = false
      return
    }
    group.visible = true
    const [rx, ry, rz] = getObjectEuler(obj)
    group.position.set(obj.position[0], obj.position[1], obj.position[2])
    group.rotation.set(rx, ry, rz)

    const isLocked = Boolean(obj.locked)
    boxMat.color.set(isLocked ? COLOR_LOCKED : COLOR_BOX)
    moveSubGroup.visible = !isLocked && mode === 'move'
    rotateSubGroup.visible = !isLocked && mode === 'rotate'
    scaleSubGroup.visible = !isLocked && mode === 'scale'

    const [sx, sy, sz] = obj.size
    const objCenterWorld = new THREE.Vector3(
      obj.position[0],
      obj.position[1] + sy / 2,
      obj.position[2],
    )
    const camDist = Math.max(1.2, cameraPos.distanceTo(objCenterWorld))
    const maxDim = Math.max(sx, sy, sz)

    // Camera-proportional & object-proportional sizing so small objects are NEVER buried!
    const handleScale = Math.max(0.14, Math.min(camDist * 0.022, Math.max(0.28, maxDim * 0.24), 1.35))
    const pad = Math.min(0.12, maxDim * 0.04)

    boxLines.scale.set(sx + pad * 2, sy + pad * 2, sz + pad * 2)
    boxLines.position.set(0, sy / 2, 0)
    boxLines.computeLineDistances()

    if (isLocked) return

    // 1. Move Mode: clean vertical lift arrow hovering strictly above the top face
    if (mode === 'move') {
      const stemLen = Math.max(0.35, handleScale * 1.15)
      liftStem.scale.set(handleScale * 0.85, stemLen / 0.9, handleScale * 0.85)
      liftStem.position.set(0, sy + pad + stemLen * 0.5, 0)

      const isHover = hoveredHandle === 'lift'
      const ls = handleScale * (isHover ? 1.24 : 1.0)
      liftCone.scale.set(ls, ls, ls)
      liftCone.position.set(0, sy + pad + stemLen + 0.22 * ls, 0)
      ;(liftCone.material as THREE.MeshBasicMaterial).color.set(isHover ? COLOR_HOVER : COLOR_AXIS_Y)
    }

    // 2. Rotate Mode: 3 clean 360° rings around object center with generous clearance
    if (mode === 'rotate') {
      const boundingR = Math.hypot(sx, sy, sz) * 0.52
      const ringR = Math.max(0.42, boundingR + Math.max(0.18, handleScale * 0.45))
      rotateSubGroup.position.set(0, sy / 2, 0)
      for (const rk of ['rotate:x', 'rotate:y', 'rotate:z'] as const) {
        const entry = handleMap.get(rk)
        if (!entry) continue
        const isHover = hoveredHandle === rk
        entry.mesh.scale.set(ringR, ringR, ringR)
        const mat = entry.mesh.material as THREE.MeshBasicMaterial
        mat.color.set(isHover ? COLOR_HOVER : entry.baseColor)
        mat.opacity = isHover ? 1.0 : 0.78
      }
    }

    // 3. Scale Mode: 6 face handles + 4 top corners pushed cleanly outside the object
    if (mode === 'scale') {
      const offset = Math.max(0.16, handleScale * 0.52)
      const place = (kind: HandleKind, x: number, y: number, z: number, scaleMult = 1) => {
        const entry = handleMap.get(kind)
        if (!entry) return
        entry.mesh.position.set(x, y, z)
        const isHover = hoveredHandle === kind
        const s = handleScale * scaleMult * (isHover ? 1.26 : 1.0)
        entry.mesh.scale.set(s, s, s)
        ;(entry.mesh.material as THREE.MeshBasicMaterial).color.set(
          isHover ? COLOR_HOVER : entry.baseColor,
        )
      }

      place('face:+x', sx / 2 + offset, sy / 2, 0)
      place('face:-x', -sx / 2 - offset, sy / 2, 0)
      place('face:+y', 0, sy + offset, 0)
      place('face:-y', 0, -offset * 0.55, 0, 0.78)
      place('face:+z', 0, sy / 2, sz / 2 + offset)
      place('face:-z', 0, sy / 2, -sz / 2 - offset)

      const cornerPad = pad + handleScale * 0.16
      const cornerScale = obj.uniformLock ? 1.12 : 0.85
      place('corner:++', sx / 2 + cornerPad, sy + cornerPad, sz / 2 + cornerPad, cornerScale)
      place('corner:+-', sx / 2 + cornerPad, sy + cornerPad, -sz / 2 - cornerPad, cornerScale)
      place('corner:-+', -sx / 2 - cornerPad, sy + cornerPad, sz / 2 + cornerPad, cornerScale)
      place('corner:--', -sx / 2 - cornerPad, sy + cornerPad, -sz / 2 - cornerPad, cornerScale)
    }
  }

  const syncBase = (base: BaseConfig, editingBase: boolean, hoveredHandle: HandleKind | null) => {
    baseGroup.visible = editingBase
    if (!editingBase) return

    const ox = base.offsetX ?? 0
    const oz = base.offsetZ ?? 0
    const handleScale = Math.max(1.0, Math.min(6.0, Math.max(base.width, base.depth) / 60))

    baseOutline.scale.set(base.width + 0.2, 1, base.depth + 0.2)
    baseOutline.position.set(ox, 0.18, oz)

    const placeBase = (kind: HandleKind, x: number, z: number, rotY: number) => {
      const entry = baseHandleMap.get(kind)
      if (!entry) return
      entry.mesh.position.set(x, 0.55 * handleScale, z)
      entry.mesh.rotation.y = rotY
      const isHover = hoveredHandle === kind
      const s = handleScale * (isHover ? 1.22 : 1.0)
      entry.mesh.scale.set(s, s, s)
      ;(entry.mesh.material as THREE.MeshBasicMaterial).color.set(
        isHover ? COLOR_HOVER : entry.baseColor,
      )
    }

    const pad = 1.4 * handleScale
    placeBase('base:+x', ox + base.width / 2 + pad, oz, Math.PI / 2)
    placeBase('base:-x', ox - base.width / 2 - pad, oz, Math.PI / 2)
    placeBase('base:+z', ox, oz + base.depth / 2 + pad, 0)
    placeBase('base:-z', ox, oz - base.depth / 2 - pad, 0)
  }

  const syncGuides = (guides: Array<{ axis: 'x' | 'z'; value: number }>, base: BaseConfig) => {
    while (guideGroup.children.length > 0) {
      const child = guideGroup.children.pop()!
      if (child instanceof THREE.Line) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    }

    if (guides.length === 0) return
    const ox = base.offsetX ?? 0
    const oz = base.offsetZ ?? 0
    const spanX = base.width * 0.55
    const spanZ = base.depth * 0.55
    for (const g of guides) {
      const pts =
        g.axis === 'x'
          ? [
              new THREE.Vector3(g.value, 0.1, oz - spanZ),
              new THREE.Vector3(g.value, 0.1, oz + spanZ),
            ]
          : [
              new THREE.Vector3(ox - spanX, 0.1, g.value),
              new THREE.Vector3(ox + spanX, 0.1, g.value),
            ]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: '#e4ab48',
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      })
      const line = new THREE.Line(geo, mat)
      line.raycast = () => {}
      guideGroup.add(line)
    }
  }

  const syncMultiSelection = (objs: SceneObject[], primaryId: string | null) => {
    while (multiBoxGroup.children.length > 0) {
      multiBoxGroup.remove(multiBoxGroup.children[multiBoxGroup.children.length - 1])
    }
    if (objs.length <= 1) return

    for (const o of objs) {
      if (o.id === primaryId) continue
      const [sx, sy, sz] = o.size
      const [rx, ry, rz] = getObjectEuler(o)
      const pad = Math.min(0.1, Math.max(sx, sy, sz) * 0.035)
      const holder = new THREE.Group()
      holder.position.set(o.position[0], o.position[1], o.position[2])
      holder.rotation.set(rx, ry, rz)
      const wire = new THREE.LineSegments(boxGeo, multiBoxMat)
      wire.scale.set(sx + pad * 2, sy + pad * 2, sz + pad * 2)
      wire.position.set(0, sy / 2, 0)
      wire.raycast = () => {}
      holder.add(wire)
      multiBoxGroup.add(holder)
    }
  }

  const syncGroupScale = (
    objs: SceneObject[],
    active: boolean,
    cameraPos: THREE.Vector3,
    hoveredHandle: HandleKind | null,
  ) => {
    groupScaleGroup.visible = active && objs.length > 1
    if (!groupScaleGroup.visible) return

    const b = computeGroupBounds(objs)
    const cx = b.pivot[0]
    const cz = b.pivot[2]
    const pad = Math.min(0.4, Math.max(0.12, Math.max(b.sizeX, b.sizeY, b.sizeZ) * 0.02))

    groupBoxLines.position.set(cx, b.minY + b.sizeY / 2, cz)
    groupBoxLines.scale.set(b.sizeX + pad * 2, b.sizeY + pad * 2, b.sizeZ + pad * 2)
    groupBoxLines.computeLineDistances()

    const centerWorld = new THREE.Vector3(cx, b.minY + b.sizeY / 2, cz)
    const camDist = Math.max(2, cameraPos.distanceTo(centerWorld))
    const sBase = Math.max(0.35, Math.min(camDist * 0.026, 2.2))

    const place = (kind: HandleKind, x: number, y: number, z: number) => {
      const entry = handleMap.get(kind)
      if (!entry) return
      entry.mesh.position.set(x, y, z)
      const isHover = hoveredHandle === kind
      const sc = sBase * (isHover ? 1.28 : 1.0)
      entry.mesh.scale.set(sc, sc, sc)
      ;(entry.mesh.material as THREE.MeshBasicMaterial).color.set(
        isHover ? COLOR_HOVER : entry.baseColor,
      )
    }

    const topY = b.maxY + pad
    place('group-corner:++', b.maxX + pad, topY, b.maxZ + pad)
    place('group-corner:+-', b.maxX + pad, topY, b.minZ - pad)
    place('group-corner:-+', b.minX - pad, topY, b.maxZ + pad)
    place('group-corner:--', b.minX - pad, topY, b.minZ - pad)
  }

  const getInteractiveMeshes = (mode: TransformMode, isMulti = false): THREE.Object3D[] => {
    if (isMulti) {
      return mode === 'scale' ? groupScaleMeshes : moveMeshes
    }
    if (mode === 'move') return moveMeshes
    if (mode === 'rotate') return rotateMeshes
    return scaleMeshes
  }

  const dispose = () => {
    boxGeo.dispose()
    boxMat.dispose()
    multiBoxMat.dispose()
    groupBoxLines.geometry.dispose()
    groupBoxMat.dispose()
    liftStemGeo.dispose()
    liftStemMat.dispose()
    baseOutlineGeo.dispose()
    handleMap.forEach(({ mesh }) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })
    baseHandleMap.forEach(({ mesh }) => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })
  }

  return {
    group,
    multiBoxGroup,
    groupScaleGroup,
    baseGroup,
    guideGroup,
    getInteractiveMeshes,
    baseInteractiveMeshes,
    syncObject,
    syncMultiSelection,
    syncGroupScale,
    syncBase,
    syncGuides,
    dispose,
  }
}
