import * as THREE from 'three'
import type { CelMaterialBank } from '../engine/celMaterials'
import { addCelEdges } from '../engine/celMaterials'

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

/**
 * Deterministic hash so lit/dark window patterns stay stable as you resize a building.
 */
function windowLitPick(seed: number, floor: number, col: number, face: number): boolean {
  const n = Math.sin(seed * 12.9898 + floor * 78.233 + col * 37.719 + face * 19.13) * 43758.5453
  return n - Math.floor(n) > 0.36
}

function hashId(id: string): number {
  let h = 1
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973
  return h
}

/**
 * Adds evenly spaced architectural window bays across all 4 walls of a floor band,
 * preserving solid corner margins so windows never clip corners.
 */
function populateFloorWindows(
  group: THREE.Group,
  w: number,
  d: number,
  yCenter: number,
  winH: number,
  floorIdx: number,
  seed: number,
  litActive: boolean,
  bank: CelMaterialBank,
  skipFrontCenterDoor = false,
) {
  const cornerMargin = 0.85
  const bayStep = 2.45
  const winW = 1.25
  const winDepth = 0.08

  const placeWall = (span: number, isZFace: boolean, sign: number, faceIdx: number) => {
    const usable = span - cornerMargin * 2
    if (usable < 1.1) return
    const cols = Math.max(1, Math.floor((usable + 0.6) / bayStep))
    const actualWinW = Math.min(winW, usable / cols - 0.35)
    if (actualWinW < 0.4) return

    const step = cols > 1 ? (usable - actualWinW) / (cols - 1) : 0
    for (let c = 0; c < cols; c++) {
      const offset = cols === 1 ? 0 : -usable / 2 + actualWinW / 2 + c * step
      if (skipFrontCenterDoor && isZFace && sign > 0 && Math.abs(offset) < 1.35) {
        continue
      }
      const isLit = litActive && windowLitPick(seed, floorIdx, c, faceIdx)
      const mat = isLit ? bank.windowLit : bank.windowDark
      const pane = makeBox(
        isZFace ? actualWinW : winDepth,
        winH,
        isZFace ? winDepth : actualWinW,
        mat,
        bank.outlineSoft,
        false,
        false,
      )
      if (isZFace) {
        pane.position.set(offset, yCenter, sign * (d / 2 + winDepth * 0.35))
      } else {
        pane.position.set(sign * (w / 2 + winDepth * 0.35), yCenter, offset)
      }
      group.add(pane)
    }
  }

  placeWall(w, true, 1, 0)
  placeWall(w, true, -1, 1)
  placeWall(d, false, 1, 2)
  placeWall(d, false, -1, 3)
}

/**
 * Adds a single main entrance (+ subtle canopy) anchored on the front (+Z) ground floor.
 * Never duplicates into 10 doors when stretching width.
 */
function addGroundEntrance(
  group: THREE.Group,
  w: number,
  d: number,
  groundH: number,
  litActive: boolean,
  bank: CelMaterialBank,
) {
  const doorW = Math.min(1.8, w * 0.38)
  const doorH = Math.min(2.45, groundH * 0.72)
  const door = makeBox(
    doorW,
    doorH,
    0.12,
    litActive ? bank.windowLit : bank.windowDark,
    bank.outline,
    false,
    false,
  )
  door.position.set(0, doorH / 2 + 0.02, d / 2 + 0.04)
  group.add(door)

  // Subtle architectural canopy above entrance
  const canopy = makeBox(doorW + 0.65, 0.14, 0.75, bank.roof, bank.outline, true, true)
  canopy.position.set(0, doorH + 0.18, d / 2 + 0.36)
  group.add(canopy)
}

/**
 * 3-Slice Parametric Flat-Roof Modern Building:
 * - Bottom: Fixed Ground Floor (~3.4m) with 1 main entrance + shopfront windows
 * - Middle: Repeating ~3.0m floors added RIGHT UNDER THE ROOF as +Y grows
 * - Top: Fixed Parapet + Rooftop unit (never stretches vertically)
 */
export function buildFlatBuilding(
  id: string,
  size: [number, number, number],
  litActive: boolean,
  bank: CelMaterialBank,
): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const seed = hashId(id)

  const roofParapetH = Math.min(0.55, h * 0.12)
  const bodyH = Math.max(2.4, h - roofParapetH)
  const groundH = Math.min(3.5, bodyH)
  const upperH = Math.max(0, bodyH - groundH)
  const middleFloors = Math.floor((upperH + 0.45) / 3.0)
  const actualFloorH = middleFloors > 0 ? upperH / middleFloors : 0

  // Main monolithic plaster shaft (clean continuous cel surface)
  const body = makeBox(w, bodyH, d, bank.plaster, bank.outline)
  body.position.y = bodyH / 2
  group.add(body)

  // Ground floor entrance & shopfront windows
  addGroundEntrance(group, w, d, groundH, litActive, bank)
  populateFloorWindows(
    group,
    w,
    d,
    Math.min(1.65, groundH * 0.5),
    Math.min(1.6, groundH * 0.48),
    0,
    seed,
    litActive,
    bank,
    true,
  )

  // Subtle cornice band separating ground floor & upper floors
  if (middleFloors > 0) {
    const band = makeBox(w + 0.22, 0.18, d + 0.22, bank.roof, bank.outlineSoft)
    band.position.y = groundH
    group.add(band)
  }

  // Repeating middle floors growing right beneath the roof cap
  for (let f = 0; f < middleFloors; f++) {
    const floorBaseY = groundH + f * actualFloorH
    const floorCenterY = floorBaseY + actualFloorH * 0.54
    const winH = Math.min(1.45, actualFloorH * 0.52)
    populateFloorWindows(group, w, d, floorCenterY, winH, f + 1, seed, litActive, bank, false)

    // Thin floor slab reveal line every floor
    if (f > 0) {
      const ledge = makeBox(w + 0.1, 0.08, d + 0.1, bank.plasterAccent, bank.outlineSoft, false, true)
      ledge.position.y = floorBaseY
      group.add(ledge)
    }
  }

  // Fixed top roof parapet cap
  const parapet = makeBox(w + 0.24, roofParapetH, d + 0.24, bank.roof, bank.outline)
  parapet.position.y = bodyH + roofParapetH / 2
  group.add(parapet)

  // Small rooftop stairwell/skylight box for silhouette interest
  if (w >= 5 && d >= 5) {
    const pentW = Math.min(2.8, w * 0.34)
    const pentD = Math.min(2.4, d * 0.32)
    const pentH = Math.min(1.1, roofParapetH * 1.6 + 0.35)
    const pent = makeBox(pentW, pentH, pentD, bank.plasterAccent, bank.outline)
    pent.position.set(-w * 0.18, bodyH + roofParapetH + pentH / 2 - 0.15, -d * 0.16)
    group.add(pent)
  }

  return group
}

/**
 * 3-Slice Parametric Gable-Roof House:
 * - Fixed ground floor with entrance + repeating middle floors right under pitched roof
 * - Pitched gable roof + chimney always remain crisp proportions at the top
 */
export function buildGableHouse(
  id: string,
  size: [number, number, number],
  litActive: boolean,
  bank: CelMaterialBank,
): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const seed = hashId(id)

  // Roof ridge height stays proportional to span (never squashed/stretched awkwardly)
  const roofH = Math.min(Math.max(1.5, d * 0.34), h * 0.44)
  const bodyH = Math.max(2.2, h - roofH)
  const groundH = Math.min(3.3, bodyH)
  const upperH = Math.max(0, bodyH - groundH)
  const middleFloors = Math.floor((upperH + 0.45) / 2.95)
  const actualFloorH = middleFloors > 0 ? upperH / middleFloors : 0

  const body = makeBox(w, bodyH, d, bank.plaster, bank.outline)
  body.position.y = bodyH / 2
  group.add(body)

  addGroundEntrance(group, w, d, groundH, litActive, bank)
  populateFloorWindows(
    group,
    w,
    d,
    Math.min(1.55, groundH * 0.5),
    Math.min(1.35, groundH * 0.44),
    0,
    seed,
    litActive,
    bank,
    true,
  )

  for (let f = 0; f < middleFloors; f++) {
    const floorBaseY = groundH + f * actualFloorH
    populateFloorWindows(
      group,
      w,
      d,
      floorBaseY + actualFloorH * 0.52,
      Math.min(1.3, actualFloorH * 0.48),
      f + 1,
      seed,
      litActive,
      bank,
      false,
    )
  }

  // Pitched gable roof prism extruded along X with slight eaves overhang
  const overhangX = 0.38
  const overhangZ = 0.42
  const halfD = d / 2 + overhangZ
  const shape = new THREE.Shape()
  shape.moveTo(-halfD, 0)
  shape.lineTo(halfD, 0)
  shape.lineTo(0, roofH)
  shape.closePath()

  const roofGeo = new THREE.ExtrudeGeometry(shape, {
    depth: w + overhangX * 2,
    bevelEnabled: false,
  })
  roofGeo.rotateY(Math.PI / 2)
  roofGeo.translate(-(w + overhangX * 2) / 2, bodyH - 0.04, 0)
  const roofMesh = new THREE.Mesh(roofGeo, bank.roof)
  roofMesh.castShadow = true
  roofMesh.receiveShadow = true
  addCelEdges(roofMesh, bank.outline)
  group.add(roofMesh)

  // Chimney on top slope
  const chim = makeBox(0.7, roofH * 0.72, 0.7, bank.plasterAccent, bank.outline)
  chim.position.set(w * 0.24, bodyH + roofH * 0.62, -d * 0.18)
  group.add(chim)

  return group
}

/**
 * 3-Slice Parametric Arcade / Colonnade Building (底层架空连廊楼):
 * Open pass-through pillars at ground floor for sightline corridor validation!
 */
export function buildArcadeBuilding(
  id: string,
  size: [number, number, number],
  litActive: boolean,
  bank: CelMaterialBank,
): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const seed = hashId(id)

  const arcadeH = Math.min(3.8, h * 0.44)
  const parapetH = 0.48
  const upperBodyH = Math.max(1.8, h - arcadeH - parapetH)

  // Ground colonnade pillars spaced cleanly around perimeter (open center sightline!)
  const pillarSize = 0.55
  const colsX = Math.max(2, Math.round(w / 3.4) + 1)
  const colsZ = Math.max(2, Math.round(d / 3.4) + 1)
  const pxSpan = Math.max(0.2, w - pillarSize)
  const pzSpan = Math.max(0.2, d - pillarSize)

  for (let ix = 0; ix < colsX; ix++) {
    const x = -pxSpan / 2 + (ix / (colsX - 1)) * pxSpan
    for (let iz = 0; iz < colsZ; iz++) {
      // Only perimeter pillars so the ground space is genuinely open to walk/see through!
      if (ix > 0 && ix < colsX - 1 && iz > 0 && iz < colsZ - 1) continue
      const z = -pzSpan / 2 + (iz / (colsZ - 1)) * pzSpan
      const pillar = makeBox(pillarSize, arcadeH, pillarSize, bank.plasterAccent, bank.outline)
      pillar.position.set(x, arcadeH / 2, z)
      group.add(pillar)
    }
  }

  // Subtle floor slab under arcade
  const slab = makeBox(w, 0.14, d, bank.sidewalk, bank.outlineSoft, false, true)
  slab.position.y = 0.07
  group.add(slab)

  // Upper solid building massing resting on arcade beams
  const upper = makeBox(w, upperBodyH, d, bank.plaster, bank.outline)
  upper.position.y = arcadeH + upperBodyH / 2
  group.add(upper)

  const upperFloors = Math.max(1, Math.floor((upperBodyH + 0.45) / 3.0))
  const floorH = upperBodyH / upperFloors
  for (let f = 0; f < upperFloors; f++) {
    populateFloorWindows(
      group,
      w,
      d,
      arcadeH + f * floorH + floorH * 0.52,
      Math.min(1.42, floorH * 0.5),
      f + 1,
      seed,
      litActive,
      bank,
      false,
    )
  }

  // Parapet top cap
  const parapet = makeBox(w + 0.22, parapetH, d + 0.22, bank.roof, bank.outline)
  parapet.position.y = arcadeH + upperBodyH + parapetH / 2
  group.add(parapet)

  return group
}

/**
 * Parametric Corner Shop (街角商店):
 * - Ground floor: wide showcase window + entrance + alternating striped cel awning + signboard
 * - Pulling +Y grows upper residential/storage floors right under the roof cap!
 */
export function buildShop(
  id: string,
  size: [number, number, number],
  litActive: boolean,
  bank: CelMaterialBank,
): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const seed = hashId(id)

  const parapetH = 0.42
  const bodyH = Math.max(2.6, h - parapetH)
  const groundH = Math.min(3.7, bodyH)
  const upperH = Math.max(0, bodyH - groundH)
  const upperFloors = Math.floor((upperH + 0.45) / 3.0)
  const actualFloorH = upperFloors > 0 ? upperH / upperFloors : 0

  const body = makeBox(w, bodyH, d, bank.plaster, bank.outline)
  body.position.y = bodyH / 2
  group.add(body)

  // Large bright shopfront glass + entrance on +Z
  const glassW = Math.max(1.6, w - 1.2)
  const glassH = Math.min(2.35, groundH * 0.68)
  const shopGlass = makeBox(
    glassW,
    glassH,
    0.1,
    litActive ? bank.windowLit : bank.windowDark,
    bank.outline,
    false,
    false,
  )
  shopGlass.position.set(0, glassH / 2 + 0.14, d / 2 + 0.04)
  group.add(shopGlass)

  // Mullion frame dividers across shopfront
  const mullions = Math.max(2, Math.round(glassW / 2.0))
  for (let i = 1; i < mullions; i++) {
    const mx = -glassW / 2 + (i / mullions) * glassW
    const m = makeBox(0.1, glassH, 0.14, bank.plasterAccent, bank.outlineSoft, false, false)
    m.position.set(mx, glassH / 2 + 0.14, d / 2 + 0.06)
    group.add(m)
  }

  // Striped cel awning overhanging front facade
  const awningW = Math.max(1.8, w - 0.6)
  const stripeCount = Math.max(4, Math.min(14, Math.round(awningW / 0.65)))
  const stripeW = awningW / stripeCount
  const awningY = glassH + 0.36
  for (let i = 0; i < stripeCount; i++) {
    const sMesh = makeBox(
      stripeW - 0.01,
      0.16,
      1.15,
      i % 2 === 0 ? bank.awningAccent : bank.plaster,
      bank.outlineSoft,
      true,
      true,
    )
    sMesh.position.set(-awningW / 2 + stripeW * (i + 0.5), awningY, d / 2 + 0.52)
    sMesh.rotation.x = 0.28
    group.add(sMesh)
  }

  // Horizontal signboard above awning + cute vertical side sign
  const signW = Math.max(2.0, w * 0.68)
  const sign = makeBox(
    signW,
    0.62,
    0.18,
    litActive ? bank.windowLit : bank.signboard,
    bank.outline,
    true,
    false,
  )
  sign.position.set(0, Math.min(bodyH - 0.35, awningY + 0.58), d / 2 + 0.12)
  group.add(sign)

  // Side vertical hanging shop sign
  const vSign = makeBox(
    0.14,
    Math.min(1.6, groundH * 0.45),
    0.58,
    litActive ? bank.windowLit : bank.awningAccent,
    bank.outline,
    true,
    false,
  )
  vSign.position.set(w / 2 + 0.32, Math.min(bodyH - 0.8, groundH * 0.72), d / 2 - 0.35)
  group.add(vSign)

  // Upper floors if pulled taller (+Y)
  for (let f = 0; f < upperFloors; f++) {
    const floorBaseY = groundH + f * actualFloorH
    populateFloorWindows(
      group,
      w,
      d,
      floorBaseY + actualFloorH * 0.54,
      Math.min(1.4, actualFloorH * 0.5),
      f + 1,
      seed,
      litActive,
      bank,
      false,
    )
  }

  const parapet = makeBox(w + 0.22, parapetH, d + 0.22, bank.roof, bank.outline)
  parapet.position.y = bodyH + parapetH / 2
  group.add(parapet)

  return group
}

/**
 * Parametric Community Supermarket (社区超市):
 * - Wide retail facade with recessed glass entrance, full-width fascia signboard band,
 *   side display windows & rooftop AC units.
 */
export function buildSupermarket(
  id: string,
  size: [number, number, number],
  litActive: boolean,
  bank: CelMaterialBank,
): THREE.Group {
  const [w, h, d] = size
  const group = new THREE.Group()
  const seed = hashId(id)

  const fasciaH = Math.min(1.15, h * 0.24)
  const bodyH = Math.max(3.0, h - fasciaH * 0.45)
  const groundH = Math.min(4.4, bodyH)
  const upperH = Math.max(0, bodyH - groundH)
  const upperFloors = Math.floor((upperH + 0.45) / 3.2)
  const actualFloorH = upperFloors > 0 ? upperH / upperFloors : 0

  const body = makeBox(w, bodyH, d, bank.plaster, bank.outline)
  body.position.y = bodyH / 2
  group.add(body)

  // Prominent colorful signboard fascia band wrapping front + side returns
  const fascia = makeBox(w + 0.45, fasciaH, d + 0.45, bank.signboard, bank.outline)
  fascia.position.y = groundH - fasciaH * 0.35
  group.add(fascia)

  // Illuminated brand strip along front fascia
  const strip = makeBox(
    Math.max(2.6, w * 0.62),
    fasciaH * 0.42,
    0.1,
    litActive ? bank.windowLit : bank.plaster,
    bank.outlineSoft,
    false,
    false,
  )
  strip.position.set(0, groundH - fasciaH * 0.35, d / 2 + 0.26)
  group.add(strip)

  // Wide glass storefront + automatic sliding door frame
  const storeW = Math.max(3.0, w - 1.8)
  const storeH = Math.min(2.75, groundH - fasciaH * 0.9 - 0.15)
  if (storeH > 0.8) {
    const glass = makeBox(
      storeW,
      storeH,
      0.12,
      litActive ? bank.windowLit : bank.windowDark,
      bank.outline,
      false,
      false,
    )
    glass.position.set(0, storeH / 2 + 0.08, d / 2 + 0.04)
    group.add(glass)

    // Sliding door frame portal at center
    const doorPortal = makeBox(Math.min(3.4, storeW * 0.35), storeH + 0.12, 0.22, bank.plasterAccent, bank.outline)
    doorPortal.position.set(0, storeH / 2 + 0.08, d / 2 + 0.06)
    // Inner dark glass inside sliding door
    const doorGlass = makeBox(
      Math.min(2.9, storeW * 0.3),
      storeH - 0.12,
      0.26,
      litActive ? bank.windowLit : bank.windowDark,
      bank.outlineSoft,
      false,
      false,
    )
    doorGlass.position.copy(doorPortal.position)
    group.add(doorPortal, doorGlass)

    // Front overhanging entry canopy
    const canopy = makeBox(storeW + 0.6, 0.18, 1.35, bank.roof, bank.outline)
    canopy.position.set(0, storeH + 0.22, d / 2 + 0.65)
    group.add(canopy)
  }

  // Upper commercial floors if stretched vertically
  for (let f = 0; f < upperFloors; f++) {
    populateFloorWindows(
      group,
      w,
      d,
      groundH + f * actualFloorH + actualFloorH * 0.54,
      Math.min(1.45, actualFloorH * 0.5),
      f + 1,
      seed,
      litActive,
      bank,
      false,
    )
  }

  // Parapet + rooftop HVAC condenser boxes
  const parapet = makeBox(w + 0.24, 0.45, d + 0.24, bank.roof, bank.outline)
  parapet.position.y = bodyH + 0.22
  group.add(parapet)

  const acCount = Math.min(3, Math.max(1, Math.floor(w / 6)))
  for (let i = 0; i < acCount; i++) {
    const ac = makeBox(1.8, 0.9, 1.3, bank.plasterAccent, bank.outline)
    const ax = -w * 0.28 + i * 2.6
    ac.position.set(ax, bodyH + 0.85, -d * 0.2)
    group.add(ac)
  }

  return group
}
