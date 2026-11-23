import * as THREE from 'three'
import type { CelMaterialBank } from '../engine/celMaterials'
import { addCelEdges } from '../engine/celMaterials'
import { getBaseMode, type BaseConfig, type SceneObject } from '../types/scene'

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  outlineMat?: THREE.LineBasicMaterial,
  castShadow = true,
  receiveShadow = true,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d))
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = castShadow
  mesh.receiveShadow = receiveShadow
  if (outlineMat) addCelEdges(mesh, outlineMat)
  return mesh
}

export function buildRoadStraight(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const curbW = Math.min(1.1, w * 0.16)
  const asphaltW = Math.max(1.0, w - curbW * 2)

  // Asphalt roadbed
  const road = makeBox(asphaltW, h * 0.72, d, bank.road, bank.outlineSoft, false, true)
  road.position.y = (h * 0.72) / 2
  group.add(road)

  // Raised sidewalks / curbs on ±X
  for (const sign of [-1, 1]) {
    const curb = makeBox(curbW, h, d, bank.sidewalk, bank.outline, false, true)
    curb.position.set(sign * (asphaltW / 2 + curbW / 2), h / 2, 0)
    group.add(curb)
  }

  // Repeating centerline dashes recalculated to real meters along Z
  const dashLen = 1.6
  const dashGap = 1.8
  const period = dashLen + dashGap
  const count = Math.max(1, Math.floor((d - 1.0) / period))
  const startZ = -((count - 1) * period) / 2
  for (let i = 0; i < count; i++) {
    const dash = makeBox(0.16, 0.03, dashLen, bank.roadMark, undefined, false, false)
    dash.position.set(0, h * 0.72 + 0.015, startZ + i * period)
    group.add(dash)
  }

  return group
}

export function buildRoadCross(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()

  const base = makeBox(w, h * 0.72, d, bank.road, bank.outlineSoft, false, true)
  base.position.y = (h * 0.72) / 2
  group.add(base)

  // 4 corner sidewalk pads
  const cw = Math.min(2.1, w * 0.2)
  const cd = Math.min(2.1, d * 0.2)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pad = makeBox(cw, h, cd, bank.sidewalk, bank.outline, false, true)
      pad.position.set(sx * (w / 2 - cw / 2), h / 2, sz * (d / 2 - cd / 2))
      group.add(pad)
    }
  }

  // 4 zebra crosswalks
  const zebraCount = 4
  const zebraSpanX = w - cw * 2 - 0.8
  const zebraSpanZ = d - cd * 2 - 0.8
  for (const sign of [-1, 1]) {
    for (let i = 0; i < zebraCount; i++) {
      const t = zebraCount > 1 ? -0.5 + i / (zebraCount - 1) : 0
      const s1 = makeBox(0.45, 0.03, 1.3, bank.roadMark, undefined, false, false)
      s1.position.set(t * zebraSpanX * 0.78, h * 0.72 + 0.015, sign * (d / 2 - 1.15))
      group.add(s1)

      const s2 = makeBox(1.3, 0.03, 0.45, bank.roadMark, undefined, false, false)
      s2.position.set(sign * (w / 2 - 1.15), h * 0.72 + 0.015, t * zebraSpanZ * 0.78)
      group.add(s2)
    }
  }

  return group
}

export function buildRoadT(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()

  const base = makeBox(w, h * 0.72, d, bank.road, bank.outlineSoft, false, true)
  base.position.y = (h * 0.72) / 2
  group.add(base)

  const cw = Math.min(2.1, w * 0.2)
  const cd = Math.min(2.1, d * 0.2)
  // Full top curb (-Z closed side)
  const backCurb = makeBox(w, h, cd, bank.sidewalk, bank.outline, false, true)
  backCurb.position.set(0, h / 2, -(d / 2 - cd / 2))
  group.add(backCurb)

  // Two front corner pads (+Z open)
  for (const sx of [-1, 1]) {
    const pad = makeBox(cw, h, cd, bank.sidewalk, bank.outline, false, true)
    pad.position.set(sx * (w / 2 - cw / 2), h / 2, d / 2 - cd / 2)
    group.add(pad)
  }

  // Crosswalk on +Z stem
  const span = w - cw * 2 - 0.8
  for (let i = 0; i < 4; i++) {
    const t = -0.5 + i / 3
    const stripe = makeBox(0.45, 0.03, 1.3, bank.roadMark, undefined, false, false)
    stripe.position.set(t * span * 0.75, h * 0.72 + 0.015, d / 2 - 1.1)
    group.add(stripe)
  }

  return group
}

export function buildRoadCorner(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const base = makeBox(w, h * 0.72, d, bank.road, bank.outlineSoft, false, true)
  base.position.y = (h * 0.72) / 2
  group.add(base)

  const cw = Math.min(2.0, w * 0.22)
  const cd = Math.min(2.0, d * 0.22)

  // Outer two closed edges (-Z and -X)
  const c1 = makeBox(w, h, cd, bank.sidewalk, bank.outline, false, true)
  c1.position.set(0, h / 2, -(d / 2 - cd / 2))
  group.add(c1)

  const c2 = makeBox(cw, h, d - cd, bank.sidewalk, bank.outline, false, true)
  c2.position.set(-(w / 2 - cw / 2), h / 2, cd / 2)
  group.add(c2)

  // Inner corner pad (+X, +Z)
  const inner = makeBox(cw, h, cd, bank.sidewalk, bank.outline, false, true)
  inner.position.set(w / 2 - cw / 2, h / 2, d / 2 - cd / 2)
  group.add(inner)

  return group
}

export function buildPlaza(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const slab = makeBox(w, h, d, bank.sidewalk, bank.outline, false, true)
  slab.position.y = h / 2
  group.add(slab)

  // Parametric 2.5m tile joint lines on top surface
  const pts: number[] = []
  const y = h + 0.015
  const step = 2.5
  for (let x = -w / 2 + step; x < w / 2 - 0.2; x += step) {
    pts.push(x, y, -d / 2 + 0.2, x, y, d / 2 - 0.2)
  }
  for (let z = -d / 2 + step; z < d / 2 - 0.2; z += step) {
    pts.push(-w / 2 + 0.2, y, z, w / 2 - 0.2, y, z)
  }
  if (pts.length > 0) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const lines = new THREE.LineSegments(geo, bank.outlineSoft)
    lines.raycast = () => {}
    group.add(lines)
  }
  return group
}

export function buildLawn(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const pad = makeBox(w, h, d, bank.lawn, bank.outline, false, true)
  pad.position.y = h / 2
  group.add(pad)
  return group
}

export function buildWater(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()

  // Subtle recessed basin rim
  const rim = makeBox(w, h * 0.6, d, bank.baseSlab, bank.outlineSoft, false, true)
  rim.position.y = h * 0.3
  group.add(rim)

  // Translucent cel water surface
  const surf = makeBox(w - 0.12, h * 0.92, d - 0.12, bank.water, bank.outlineSoft, false, true)
  surf.position.y = h * 0.46 + 0.02
  group.add(surf)

  // Animated concentric ripple rings (shown/animated during Rainy Night!)
  const rippleCount = Math.min(10, Math.max(3, Math.floor((w * d) / 26)))
  for (let i = 0; i < rippleCount; i++) {
    const rGeo = new THREE.RingGeometry(0.28, 0.36, 20)
    rGeo.rotateX(-Math.PI / 2)
    const rMat = new THREE.MeshBasicMaterial({
      color: '#d8f2ff',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(rGeo, rMat)
    const rx = ((((i * 73) % 100) / 100) - 0.5) * Math.max(0.6, w - 1.6)
    const rz = ((((i * 41 + 17) % 100) / 100) - 0.5) * Math.max(0.6, d - 1.6)
    ring.position.set(rx, h + 0.03, rz)
    ring.userData.isWaterRipple = true
    ring.userData.phase = (i / rippleCount) * Math.PI * 2
    ring.raycast = () => {}
    group.add(ring)
  }

  return group
}

export function buildSteps(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const count = Math.max(2, Math.min(24, Math.round(h / 0.28)))
  const stepH = h / count
  const stepD = d / count

  for (let i = 0; i < count; i++) {
    const curH = stepH * (i + 1)
    const block = makeBox(w, curH, stepD, bank.plasterAccent, bank.outline)
    block.position.set(0, curH / 2, -d / 2 + stepD * (i + 0.5))
    group.add(block)
  }
  return group
}

/**
 * Smart Stretchable Miniature Base:
 * - Default 60m x 60m (up to 1000m x 1000m) diorama slab with cel cutaway thickness
 * - Single non-overlapping multi-material BoxGeometry eliminates all coplanar Z-fighting flicker!
 * - Respects offsetX / offsetZ so pulling any one edge keeps the opposite edge nailed in place!
 * - Detects water blocks touching base perimeter and renders translucent cel-blue cutaway bands!
 */
export function buildBaseGroup(
  base: BaseConfig,
  objects: SceneObject[],
  bank: CelMaterialBank,
): THREE.Group {
  const group = new THREE.Group()
  group.name = '__BASE_GROUP__'
  const ox = base.offsetX ?? 0
  const oz = base.offsetZ ?? 0
  const mode = getBaseMode(base)

  // 'none': Completely hide default blank base (ideal when imported HTML brings its own sculpted base!)
  if (mode === 'none') {
    return group
  }

  if (mode === 'horizon') {
    // Seamless horizon ground plane fading into fog (covers up to 1km+ comfortably)
    const planeGeo = new THREE.PlaneGeometry(3200, 3200)
    planeGeo.rotateX(-Math.PI / 2)
    const plane = new THREE.Mesh(planeGeo, bank.baseTop)
    plane.position.set(ox, -0.02, oz)
    plane.receiveShadow = true
    plane.userData.isGround = true
    group.add(plane)
    return group
  }

  const { width, depth, thickness } = base

  // Single clean multi-material box: +Y face uses warm baseTop, all sides use baseSlab (ZERO coplanar overlap!)
  const slabGeo = new THREE.BoxGeometry(width, thickness, depth)
  const slabMats = [
    bank.baseSlab,
    bank.baseSlab,
    bank.baseTop,
    bank.baseSlab,
    bank.baseSlab,
    bank.baseSlab,
  ]
  const slab = new THREE.Mesh(slabGeo, slabMats)
  slab.position.set(ox, -thickness / 2 - 0.015, oz)
  slab.receiveShadow = true
  slab.castShadow = false
  slab.userData.isGround = true
  addCelEdges(slab, bank.outline)
  group.add(slab)

  // Subtle floating diorama shadow pad underneath
  const shadowPadMargin = Math.min(18, Math.max(4.5, Math.max(width, depth) * 0.06))
  const shadowGeo = new THREE.PlaneGeometry(width + shadowPadMargin, depth + shadowPadMargin)
  shadowGeo.rotateX(-Math.PI / 2)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#1b2436',
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  })
  const shadowPad = new THREE.Mesh(shadowGeo, shadowMat)
  shadowPad.position.set(ox, -thickness - 1.1, oz)
  shadowPad.raycast = () => {}
  group.add(shadowPad)

  // Water cutaway slices on perimeter edges whenever a water block touches the base border!
  const bMinX = ox - width / 2
  const bMaxX = ox + width / 2
  const bMinZ = oz - depth / 2
  const bMaxZ = oz + depth / 2
  const cutDepth = Math.min(1.6, thickness * 0.55)
  const tol = 0.75

  for (const obj of objects) {
    if (obj.kind !== 'water') continue
    const rot = Math.abs(Math.sin(obj.rotationY))
    const wx = rot > 0.5 ? obj.size[2] : obj.size[0]
    const wz = rot > 0.5 ? obj.size[0] : obj.size[2]
    const minX = obj.position[0] - wx / 2
    const maxX = obj.position[0] + wx / 2
    const minZ = obj.position[2] - wz / 2
    const maxZ = obj.position[2] + wz / 2

    if (maxZ >= bMaxZ - tol && minZ <= bMaxZ + tol) {
      const span = Math.min(maxX, bMaxX) - Math.max(minX, bMinX)
      if (span > 0.4) {
        const cx = (Math.min(maxX, bMaxX) + Math.max(minX, bMinX)) / 2
        const slice = makeBox(span, cutDepth, 0.14, bank.waterCutaway, bank.outlineSoft, false, false)
        slice.position.set(cx, -cutDepth / 2 + 0.02, bMaxZ + 0.06)
        slice.raycast = () => {}
        group.add(slice)
      }
    }
    if (minZ <= bMinZ + tol && maxZ >= bMinZ - tol) {
      const span = Math.min(maxX, bMaxX) - Math.max(minX, bMinX)
      if (span > 0.4) {
        const cx = (Math.min(maxX, bMaxX) + Math.max(minX, bMinX)) / 2
        const slice = makeBox(span, cutDepth, 0.14, bank.waterCutaway, bank.outlineSoft, false, false)
        slice.position.set(cx, -cutDepth / 2 + 0.02, bMinZ - 0.06)
        slice.raycast = () => {}
        group.add(slice)
      }
    }
    if (maxX >= bMaxX - tol && minX <= bMaxX + tol) {
      const span = Math.min(maxZ, bMaxZ) - Math.max(minZ, bMinZ)
      if (span > 0.4) {
        const cz = (Math.min(maxZ, bMaxZ) + Math.max(minZ, bMinZ)) / 2
        const slice = makeBox(0.14, cutDepth, span, bank.waterCutaway, bank.outlineSoft, false, false)
        slice.position.set(bMaxX + 0.06, -cutDepth / 2 + 0.02, cz)
        slice.raycast = () => {}
        group.add(slice)
      }
    }
    if (minX <= bMinX + tol && maxX >= bMinX - tol) {
      const span = Math.min(maxZ, bMaxZ) - Math.max(minZ, bMinZ)
      if (span > 0.4) {
        const cz = (Math.min(maxZ, bMaxZ) + Math.max(minZ, bMinZ)) / 2
        const slice = makeBox(0.14, cutDepth, span, bank.waterCutaway, bank.outlineSoft, false, false)
        slice.position.set(bMinX - 0.06, -cutDepth / 2 + 0.02, cz)
        slice.raycast = () => {}
        group.add(slice)
      }
    }
  }

  return group
}
