import * as THREE from 'three'
import type { CelMaterialBank } from '../engine/celMaterials'
import { addCelEdges } from '../engine/celMaterials'
import type { WeatherConfig } from '../engine/weatherPresets'
import type { SceneObject } from '../types/scene'
import {
  buildArcadeBuilding,
  buildFlatBuilding,
  buildGableHouse,
  buildShop,
  buildSupermarket,
} from './buildingBuilders'
import {
  buildLawn,
  buildPlaza,
  buildRoadCorner,
  buildRoadCross,
  buildRoadStraight,
  buildRoadT,
  buildSteps,
  buildWater,
} from './streetBuilders'

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

function buildBoxBlock(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const m = makeBox(w, h, d, bank.plaster, bank.outline)
  m.position.y = h / 2
  g.add(m)
  return g
}

function buildCylinderBlock(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const geo = new THREE.CylinderGeometry(0.5, 0.5, h, 24)
  const m = new THREE.Mesh(geo, bank.plaster)
  m.scale.set(w, 1, d)
  m.position.y = h / 2
  m.castShadow = true
  m.receiveShadow = true
  addCelEdges(m, bank.outline, 28)
  g.add(m)
  return g
}

function buildWedgeBlock(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-d / 2, 0)
  shape.lineTo(d / 2, 0)
  shape.lineTo(d / 2, h)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })
  geo.rotateY(Math.PI / 2)
  geo.translate(-w / 2, 0, 0)
  const m = new THREE.Mesh(geo, bank.plaster)
  m.castShadow = true
  m.receiveShadow = true
  addCelEdges(m, bank.outline)
  g.add(m)
  return g
}

function buildArchBlock(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const pierW = Math.min(w * 0.26, Math.max(0.55, w * 0.22))
  const openW = Math.max(0.6, w - pierW * 2)
  const archR = openW / 2
  const lintelH = Math.max(0.65, h * 0.22)
  const springY = Math.max(0.4, h - lintelH - archR)

  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0)
  shape.lineTo(-w / 2, h)
  shape.lineTo(w / 2, h)
  shape.lineTo(w / 2, 0)
  shape.lineTo(openW / 2, 0)
  shape.lineTo(openW / 2, springY)
  shape.absarc(0, springY, archR, 0, Math.PI, false)
  shape.lineTo(-openW / 2, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 18 })
  geo.translate(0, 0, -d / 2)
  const m = new THREE.Mesh(geo, bank.plaster)
  m.castShadow = true
  m.receiveShadow = true
  addCelEdges(m, bank.outline, 20)
  g.add(m)
  return g
}

function buildRoundTree(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const trunkH = h * 0.42
  const trunkR = Math.min(w, d) * 0.085
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.72, trunkR * 1.15, trunkH, 8)
  const trunk = new THREE.Mesh(trunkGeo, bank.trunk)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  trunk.receiveShadow = true
  addCelEdges(trunk, bank.outlineSoft, 35)
  g.add(trunk)

  // Multi-puff stylized cel canopy (tagged for gentle breeze sway)
  const canopy = new THREE.Group()
  canopy.position.y = trunkH
  canopy.userData.sway = true

  const puffs: Array<[number, number, number, number, boolean]> = [
    [0, h * 0.24, 0, 0.36, false],
    [-0.22, h * 0.16, 0.15, 0.26, true],
    [0.24, h * 0.19, -0.12, 0.25, false],
    [0.08, h * 0.34, 0.16, 0.22, true],
  ]
  for (const [px, py, pz, rFactor, alt] of puffs) {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mesh = new THREE.Mesh(geo, alt ? bank.foliageAlt : bank.foliage)
    mesh.scale.set(w * rFactor, h * rFactor * 0.65, d * rFactor)
    mesh.position.set(px * w, py, pz * d)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCelEdges(mesh, bank.outlineSoft, 34)
    canopy.add(mesh)
  }

  g.add(canopy)
  return g
}

function buildPineTree(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const trunkH = h * 0.26
  const trunkR = Math.min(w, d) * 0.09
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.75, trunkR * 1.2, trunkH, 8)
  const trunk = new THREE.Mesh(trunkGeo, bank.trunk)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  g.add(trunk)

  const canopy = new THREE.Group()
  canopy.position.y = trunkH * 0.85
  canopy.userData.sway = true

  const layers = [
    { y: h * 0.18, r: 0.5, lh: h * 0.36, alt: true },
    { y: h * 0.4, r: 0.39, lh: h * 0.34, alt: false },
    { y: h * 0.62, r: 0.26, lh: h * 0.3, alt: true },
  ]
  for (const l of layers) {
    const geo = new THREE.ConeGeometry(1, l.lh, 7)
    const mesh = new THREE.Mesh(geo, l.alt ? bank.foliageAlt : bank.foliage)
    mesh.scale.set(w * l.r, 1, d * l.r)
    mesh.position.y = l.y
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCelEdges(mesh, bank.outlineSoft, 30)
    canopy.add(mesh)
  }
  g.add(canopy)
  return g
}

function buildBush(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const spots: Array<[number, number, number, number, boolean]> = [
    [0, h * 0.45, 0, 0.44, false],
    [-0.25, h * 0.34, 0.1, 0.32, true],
    [0.25, h * 0.36, -0.08, 0.33, true],
  ]
  for (const [px, py, pz, r, alt] of spots) {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mesh = new THREE.Mesh(geo, alt ? bank.foliageAlt : bank.foliage)
    mesh.scale.set(w * r, h * r * 1.05, d * r)
    mesh.position.set(px * w, py, pz * d)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCelEdges(mesh, bank.outlineSoft, 36)
    g.add(mesh)
  }
  return g
}

function buildStreetLamp(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const basePad = makeBox(w * 0.4, 0.22, d * 0.4, bank.lampPost, bank.outline)
  basePad.position.y = 0.11
  g.add(basePad)

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, h - 0.35, 8)
  const pole = new THREE.Mesh(poleGeo, bank.lampPost)
  pole.position.y = (h - 0.35) / 2 + 0.2
  pole.castShadow = true
  g.add(pole)

  const arm = makeBox(0.08, 0.08, Math.max(0.55, d * 0.72), bank.lampPost, bank.outlineSoft)
  arm.position.set(0, h - 0.2, Math.max(0.24, d * 0.32))
  g.add(arm)

  const head = makeBox(0.32, 0.12, 0.42, bank.lampPost, bank.outline)
  head.position.set(0, h - 0.18, Math.max(0.45, d * 0.56))
  g.add(head)

  const bulbGeo = new THREE.SphereGeometry(0.14, 10, 10)
  const bulb = new THREE.Mesh(bulbGeo, bank.lampBulb)
  bulb.position.set(0, h - 0.28, Math.max(0.45, d * 0.56))
  g.add(bulb)

  // Soft cel glow halo visible in dusk & rainy night
  const haloGeo = new THREE.SphereGeometry(0.95, 14, 12)
  const halo = new THREE.Mesh(haloGeo, bank.lampHalo)
  halo.position.copy(bulb.position)
  halo.raycast = () => {}
  g.add(halo)

  return g
}

function buildCar(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const wheelR = Math.min(h * 0.26, 0.35)

  // Lower chassis
  const lowerH = h * 0.44
  const lower = makeBox(w * 0.94, lowerH, d, bank.carBody, bank.outline)
  lower.position.y = wheelR + lowerH / 2 - 0.08
  g.add(lower)

  // Upper cabin
  const cabinH = h * 0.38
  const cabin = makeBox(w * 0.8, cabinH, d * 0.52, bank.plaster, bank.outline)
  cabin.position.set(0, wheelR + lowerH + cabinH / 2 - 0.1, -d * 0.05)
  g.add(cabin)

  // Windshield band
  const glass = makeBox(w * 0.82, cabinH * 0.62, d * 0.44, bank.windowDark, bank.outlineSoft, false, false)
  glass.position.copy(cabin.position)
  g.add(glass)

  // 4 wheels
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 12)
  wheelGeo.rotateZ(Math.PI / 2)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeo, bank.lampPost)
      wheel.position.set(sx * (w * 0.45), wheelR, sz * (d * 0.3))
      wheel.castShadow = true
      g.add(wheel)
    }
  }

  return g
}

function buildBench(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const seatY = h * 0.52
  const seat = makeBox(w, 0.1, d * 0.68, bank.benchWood, bank.outline)
  seat.position.set(0, seatY, 0.06)
  g.add(seat)

  const back = makeBox(w, h * 0.38, 0.09, bank.benchWood, bank.outline)
  back.position.set(0, seatY + h * 0.25, -d * 0.32)
  back.rotation.x = -0.14
  g.add(back)

  for (const sx of [-1, 1]) {
    const leg = makeBox(0.1, seatY, d * 0.62, bank.lampPost, bank.outlineSoft)
    leg.position.set(sx * (w * 0.38), seatY / 2, 0.02)
    g.add(leg)
  }
  return g
}

function buildBanyanTree(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const trunkH = h * 0.48
  const baseR = Math.min(w, d) * 0.12

  // Thick fluted trunk + spreading buttress roots
  const trunkGeo = new THREE.CylinderGeometry(baseR * 0.65, baseR * 1.35, trunkH, 9)
  const trunk = new THREE.Mesh(trunkGeo, bank.trunk)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  trunk.receiveShadow = true
  addCelEdges(trunk, bank.outlineSoft, 30)
  g.add(trunk)

  // Hanging aerial roots dropping down from canopy (classic banyan silhouette!)
  const aerialSpots: Array<[number, number, number]> = [
    [-0.28, 0.14, 0.85],
    [0.3, -0.1, 0.78],
    [-0.12, -0.28, 0.92],
    [0.2, 0.26, 0.72],
    [-0.32, -0.14, 0.65],
  ]
  for (const [ax, az, lenFrac] of aerialSpots) {
    const rH = trunkH * lenFrac
    const rootGeo = new THREE.CylinderGeometry(0.055, 0.075, rH, 6)
    const root = new THREE.Mesh(rootGeo, bank.trunk)
    root.position.set(ax * w, trunkH - rH / 2 + 0.35, az * d)
    root.castShadow = true
    g.add(root)
  }

  // Broad multi-tiered spreading cel canopy
  const canopy = new THREE.Group()
  canopy.position.y = trunkH
  canopy.userData.sway = true

  const puffs: Array<[number, number, number, number, number, boolean]> = [
    [0, h * 0.22, 0, 0.34, 0.44, false],
    [-0.26, h * 0.14, 0.14, 0.28, 0.36, true],
    [0.28, h * 0.15, -0.12, 0.27, 0.36, false],
    [-0.14, h * 0.13, -0.25, 0.25, 0.34, true],
    [0.16, h * 0.16, 0.24, 0.26, 0.35, true],
    [0.04, h * 0.32, -0.04, 0.22, 0.34, false],
  ]
  for (const [px, py, pz, rXZ, rY, alt] of puffs) {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mesh = new THREE.Mesh(geo, alt ? bank.foliageAlt : bank.foliage)
    mesh.scale.set(w * rXZ, h * rY * 0.52, d * rXZ)
    mesh.position.set(px * w, py, pz * d)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCelEdges(mesh, bank.outlineSoft, 34)
    canopy.add(mesh)
  }
  g.add(canopy)
  return g
}

function buildBirchTree(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const trunkH = h * 0.64
  const trunkR = Math.min(w, d) * 0.058

  // Slender white-barked birch trunk
  const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.62, trunkR * 1.15, trunkH, 8)
  const trunk = new THREE.Mesh(trunkGeo, bank.birchBark)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  trunk.receiveShadow = true
  addCelEdges(trunk, bank.outlineSoft, 32)
  g.add(trunk)

  // Signature horizontal dark bark markings on white birch trunk
  const bandCount = 6
  for (let i = 0; i < bandCount; i++) {
    const t = (i + 0.6) / (bandCount + 0.5)
    const r = trunkR * (1.15 - t * 0.5) * 1.08
    const mark = makeBox(r * 1.9, 0.09, r * 1.9, bank.birchMark, undefined, false, false)
    mark.position.set((i % 2 === 0 ? 1 : -1) * 0.02, trunkH * t, 0)
    mark.rotation.y = i * 0.9
    g.add(mark)
  }

  // Airy high light-toned cel foliage clusters
  const canopy = new THREE.Group()
  canopy.position.y = trunkH * 0.88
  canopy.userData.sway = true

  const clusters: Array<[number, number, number, number, boolean]> = [
    [0, h * 0.24, 0, 0.33, true],
    [-0.18, h * 0.14, 0.12, 0.26, false],
    [0.19, h * 0.18, -0.1, 0.25, true],
    [0.02, h * 0.35, 0.06, 0.21, true],
  ]
  for (const [px, py, pz, rf, light] of clusters) {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const mesh = new THREE.Mesh(geo, light ? bank.foliageLight : bank.foliage)
    mesh.scale.set(w * rf, h * rf * 0.58, d * rf)
    mesh.position.set(px * w, py, pz * d)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCelEdges(mesh, bank.outlineSoft, 34)
    canopy.add(mesh)
  }
  g.add(canopy)
  return g
}

function buildUtilityPole(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()

  // Tapered concrete utility pole
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.19, h, 8)
  const pole = new THREE.Mesh(poleGeo, bank.plasterAccent)
  pole.position.y = h / 2
  pole.castShadow = true
  pole.receiveShadow = true
  addCelEdges(pole, bank.outline, 28)
  g.add(pole)

  // Two horizontal crossarms + diagonal struts + ceramic insulators
  const armYs = [h * 0.88, h * 0.78]
  for (const ay of armYs) {
    const arm = makeBox(w, 0.11, 0.11, bank.lampPost, bank.outline)
    arm.position.set(0, ay, 0)
    g.add(arm)

    for (const sx of [-1, 1]) {
      const brace = makeBox(0.06, 0.62, 0.06, bank.lampPost, undefined, false, false)
      brace.position.set(sx * w * 0.18, ay - 0.26, 0)
      brace.rotation.z = sx * 0.65
      g.add(brace)
    }

    for (const fx of [-0.44, -0.22, 0.22, 0.44]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6), bank.plaster)
      ins.position.set(fx * w, ay + 0.14, 0)
      g.add(ins)
    }
  }

  // Pole-mounted cylindrical transformer drum
  const drumGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.85, 10)
  const drum = new THREE.Mesh(drumGeo, bank.roof)
  drum.position.set(0, h * 0.66, Math.min(0.42, d * 0.34))
  drum.castShadow = true
  addCelEdges(drum, bank.outline, 28)
  g.add(drum)

  return g
}

function buildElectricBox(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const plinthH = Math.min(0.22, h * 0.18)
  const bodyH = h - plinthH - 0.12

  const plinth = makeBox(w + 0.12, plinthH, d + 0.12, bank.baseSlab, bank.outline)
  plinth.position.y = plinthH / 2
  g.add(plinth)

  const cabinet = makeBox(w, bodyH, d, bank.utilityGreen, bank.outline)
  cabinet.position.y = plinthH + bodyH / 2
  g.add(cabinet)

  // Slight overhanging rain hood cap
  const hood = makeBox(w + 0.14, 0.12, d + 0.16, bank.roof, bank.outline)
  hood.position.y = plinthH + bodyH + 0.06
  g.add(hood)

  // Double door center seam + vent louver bars on +Z face
  const seam = makeBox(0.04, bodyH * 0.85, 0.04, bank.lampPost, undefined, false, false)
  seam.position.set(0, plinthH + bodyH / 2, d / 2 + 0.02)
  g.add(seam)

  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const vent = makeBox(w * 0.3, 0.05, 0.04, bank.lampPost, undefined, false, false)
      vent.position.set(sx * w * 0.24, plinthH + bodyH * 0.25 + i * 0.11, d / 2 + 0.02)
      g.add(vent)
    }
  }

  return g
}

function buildTrashBin(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const binW = w * 0.46
  const bodyH = h * 0.78

  // Dual compartment bodies (left cerulean-grey, right muted utility green)
  for (const [idx, sx] of [-1, 1].entries()) {
    const body = makeBox(
      binW,
      bodyH,
      d,
      idx === 0 ? bank.signboard : bank.utilityGreen,
      bank.outline,
    )
    body.position.set(sx * (w * 0.25), bodyH / 2, 0)
    g.add(body)

    // Recessed disposal slot on +Z front
    const slot = makeBox(binW * 0.65, h * 0.15, 0.06, bank.lampPost, undefined, false, false)
    slot.position.set(sx * (w * 0.25), bodyH * 0.76, d / 2 + 0.02)
    g.add(slot)
  }

  // Shared top rain hood canopy
  const roof = makeBox(w + 0.08, h * 0.12, d + 0.1, bank.roof, bank.outline)
  roof.position.y = h - (h * 0.12) / 2
  g.add(roof)

  return g
}

function buildWideBench(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()
  const seatY = Math.min(0.48, h * 0.56)

  // Solid architectural concrete/stone plinth supports
  const plinth = makeBox(w * 0.88, seatY - 0.08, d * 0.82, bank.plasterAccent, bank.outline)
  plinth.position.y = (seatY - 0.08) / 2
  g.add(plinth)

  // Wide slatted timber deck seat (recalculates slats cleanly)
  const slatCount = Math.max(3, Math.round(d / 0.28))
  const slatD = (d - 0.08 * (slatCount - 1)) / slatCount
  for (let i = 0; i < slatCount; i++) {
    const slat = makeBox(w, 0.1, slatD, bank.benchWood, bank.outline)
    slat.position.set(0, seatY, -d / 2 + slatD / 2 + i * (slatD + 0.08))
    g.add(slat)
  }

  // Asymmetric modern split backrest on rear portion
  if (h > 0.62) {
    const backH = h - seatY
    const back = makeBox(w * 0.62, backH * 0.78, 0.12, bank.benchWood, bank.outline)
    back.position.set(-w * 0.14, seatY + backH * 0.52, -d * 0.34)
    back.rotation.x = -0.14
    g.add(back)
  }

  return g
}

function buildHumanFigure(size: [number, number, number], bank: CelMaterialBank): THREE.Group {
  const [w, h, d] = size
  const g = new THREE.Group()

  // Legs
  const legH = h * 0.45
  for (const sx of [-1, 1]) {
    const legGeo = new THREE.CylinderGeometry(w * 0.13, w * 0.11, legH, 8)
    const leg = new THREE.Mesh(legGeo, bank.human)
    leg.position.set(sx * w * 0.16, legH / 2, 0)
    leg.castShadow = true
    g.add(leg)
  }

  // Stylized torso capsule
  const torsoH = h * 0.34
  const torsoGeo = new THREE.CylinderGeometry(w * 0.32, w * 0.24, torsoH, 10)
  const torso = new THREE.Mesh(torsoGeo, bank.human)
  torso.position.y = legH + torsoH / 2
  torso.scale.set(1, 1, Math.max(0.65, d / Math.max(0.1, w)))
  torso.castShadow = true
  g.add(torso)

  // Head
  const headR = h * 0.105
  const headGeo = new THREE.SphereGeometry(headR, 12, 10)
  const head = new THREE.Mesh(headGeo, bank.human)
  head.position.y = legH + torsoH + headR * 1.15
  head.castShadow = true
  g.add(head)

  return g
}

/**
 * Unified procedural builder used by BOTH the live editor AND the exported standalone HTML viewer.
 */
export function buildProceduralObject(
  obj: SceneObject,
  bank: CelMaterialBank,
  weather: WeatherConfig,
): THREE.Group {
  const litActive = Boolean(obj.litWindows) && weather.windowGlowStrength > 0.15

  switch (obj.kind) {
    case 'road_straight':
      return buildRoadStraight(obj.size, bank)
    case 'road_cross':
      return buildRoadCross(obj.size, bank)
    case 'road_t':
      return buildRoadT(obj.size, bank)
    case 'road_corner':
      return buildRoadCorner(obj.size, bank)
    case 'plaza':
      return buildPlaza(obj.size, bank)
    case 'lawn':
      return buildLawn(obj.size, bank)
    case 'water':
      return buildWater(obj.size, bank)
    case 'steps':
      return buildSteps(obj.size, bank)
    case 'flat_building':
      return buildFlatBuilding(obj.id, obj.size, litActive, bank)
    case 'gable_house':
      return buildGableHouse(obj.id, obj.size, litActive, bank)
    case 'arcade_building':
      return buildArcadeBuilding(obj.id, obj.size, litActive, bank)
    case 'shop':
      return buildShop(obj.id, obj.size, litActive, bank)
    case 'supermarket':
      return buildSupermarket(obj.id, obj.size, litActive, bank)
    case 'box_block':
      return buildBoxBlock(obj.size, bank)
    case 'cylinder_block':
      return buildCylinderBlock(obj.size, bank)
    case 'wedge_block':
      return buildWedgeBlock(obj.size, bank)
    case 'arch_block':
      return buildArchBlock(obj.size, bank)
    case 'round_tree':
      return buildRoundTree(obj.size, bank)
    case 'pine_tree':
      return buildPineTree(obj.size, bank)
    case 'banyan_tree':
      return buildBanyanTree(obj.size, bank)
    case 'birch_tree':
      return buildBirchTree(obj.size, bank)
    case 'bush':
      return buildBush(obj.size, bank)
    case 'street_lamp':
      return buildStreetLamp(obj.size, bank)
    case 'utility_pole':
      return buildUtilityPole(obj.size, bank)
    case 'electric_box':
      return buildElectricBox(obj.size, bank)
    case 'trash_bin':
      return buildTrashBin(obj.size, bank)
    case 'car':
      return buildCar(obj.size, bank)
    case 'bench':
      return buildBench(obj.size, bank)
    case 'wide_bench':
      return buildWideBench(obj.size, bank)
    case 'human_figure':
      return buildHumanFigure(obj.size, bank)
    default:
      return buildBoxBlock(obj.size, bank)
  }
}
