import * as THREE from 'three'
import type { WeatherConfig } from './weatherPresets'

export interface CelMaterialBank {
  gradientMap: THREE.DataTexture
  plaster: THREE.MeshToonMaterial
  plasterAccent: THREE.MeshToonMaterial
  roof: THREE.MeshToonMaterial
  road: THREE.MeshToonMaterial
  roadMark: THREE.MeshToonMaterial
  sidewalk: THREE.MeshToonMaterial
  lawn: THREE.MeshToonMaterial
  foliage: THREE.MeshToonMaterial
  foliageAlt: THREE.MeshToonMaterial
  foliageLight: THREE.MeshToonMaterial
  trunk: THREE.MeshToonMaterial
  birchBark: THREE.MeshToonMaterial
  birchMark: THREE.MeshToonMaterial
  water: THREE.MeshToonMaterial
  waterCutaway: THREE.MeshToonMaterial
  baseSlab: THREE.MeshToonMaterial
  baseTop: THREE.MeshToonMaterial
  windowDark: THREE.MeshToonMaterial
  windowLit: THREE.MeshBasicMaterial
  awningAccent: THREE.MeshToonMaterial
  signboard: THREE.MeshToonMaterial
  utilityGreen: THREE.MeshToonMaterial
  lampPost: THREE.MeshToonMaterial
  lampBulb: THREE.MeshBasicMaterial
  lampHalo: THREE.MeshBasicMaterial
  human: THREE.MeshToonMaterial
  carBody: THREE.MeshToonMaterial
  benchWood: THREE.MeshToonMaterial
  outline: THREE.LineBasicMaterial
  outlineSoft: THREE.LineBasicMaterial
  importedWhite: THREE.MeshToonMaterial
  updateWeather: (weather: WeatherConfig) => void
  dispose: () => void
}

export function createCelGradientMap(): THREE.DataTexture {
  const bands = new Uint8Array([
    142, 142, 142, 255,
    208, 208, 208, 255,
    255, 255, 255, 255,
  ])
  const tex = new THREE.DataTexture(bands, 3, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function createCelMaterialBank(initial: WeatherConfig): CelMaterialBank {
  const gradientMap = createCelGradientMap()

  const toon = (color: string, opts: Partial<THREE.MeshToonMaterialParameters> = {}) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap,
      ...opts,
    })

  const plaster = toon(initial.plasterColor)
  const plasterAccent = toon('#eee8db')
  const roof = toon(initial.roofColor)
  const road = toon(initial.roadColor)
  const roadMark = toon('#f7f5ee')
  const sidewalk = toon(initial.sidewalkColor)
  const lawn = toon(initial.foliageColor)
  const foliage = toon(initial.foliageColor)
  const foliageAlt = toon(initial.foliageAltColor)
  const foliageLight = toon('#b0cf9e')
  const trunk = toon('#8f7b6d')
  const birchBark = toon('#f2efe8')
  const birchMark = toon('#4d4945')
  const water = toon(initial.waterColor, {
    transparent: true,
    opacity: initial.waterOpacity,
  })
  const waterCutaway = toon(initial.waterColor, {
    transparent: true,
    opacity: 0.72,
  })
  // polygonOffset eliminates any ground/base Z-fighting across 1m..1000m distances
  const baseSlab = toon(initial.baseSlabColor, {
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  })
  const baseTop = toon(initial.baseTopColor, {
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  })
  const windowDark = toon(initial.windowDarkColor)
  const windowLit = new THREE.MeshBasicMaterial({
    color: initial.windowLitColor,
  })
  const awningAccent = toon('#c96f53')
  const signboard = toon('#4f7c94')
  const utilityGreen = toon('#789486')
  const lampPost = toon('#566170')
  const lampBulb = new THREE.MeshBasicMaterial({
    color: '#fff6d6',
  })
  const lampHalo = new THREE.MeshBasicMaterial({
    color: '#ffd680',
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  })
  const human = toon('#3a4859')
  const carBody = toon('#d7e1e8')
  const benchWood = toon('#bfa48a')
  const importedWhite = toon(initial.plasterColor)

  const outline = new THREE.LineBasicMaterial({
    color: initial.outlineColor,
    transparent: true,
    opacity: initial.outlineOpacity,
  })

  const outlineSoft = new THREE.LineBasicMaterial({
    color: initial.outlineColor,
    transparent: true,
    opacity: initial.outlineOpacity * 0.45,
  })

  const updateWeather = (w: WeatherConfig) => {
    const night = w.hudTheme === 'night'
    plaster.color.set(w.plasterColor)
    importedWhite.color.set(w.plasterColor)
    plasterAccent.color.set(night ? '#b0bdd0' : '#eee8db')
    roof.color.set(w.roofColor)
    road.color.set(w.roadColor)
    roadMark.color.set(night ? '#cbd4e3' : '#f7f5ee')
    sidewalk.color.set(w.sidewalkColor)
    lawn.color.set(w.foliageColor)
    foliage.color.set(w.foliageColor)
    foliageAlt.color.set(w.foliageAltColor)
    foliageLight.color.set(night ? '#598276' : '#b2cf9e')
    trunk.color.set(night ? '#58525c' : '#8f7b6d')
    birchBark.color.set(night ? '#c2ccd9' : '#f3f0e8')
    birchMark.color.set(night ? '#2c3447' : '#4d4945')
    water.color.set(w.waterColor)
    water.opacity = w.waterOpacity
    waterCutaway.color.set(w.waterColor)
    baseSlab.color.set(w.baseSlabColor)
    baseTop.color.set(w.baseTopColor)
    windowDark.color.set(w.windowDarkColor)
    windowLit.color.set(w.windowLitColor)
    awningAccent.color.set(night ? '#855359' : '#c96f53')
    signboard.color.set(night ? '#3c6282' : '#4f7c94')
    utilityGreen.color.set(night ? '#4d6666' : '#789486')
    lampPost.color.set(night ? '#3b4459' : '#566170')
    lampBulb.color.set(w.lampGlowStrength > 0.2 ? '#ffe59c' : '#e6e2d8')
    lampHalo.opacity = w.lampGlowStrength * 0.28
    human.color.set(night ? '#95adc7' : '#3a4859')
    carBody.color.set(night ? '#a6b6cc' : '#dce4ea')
    benchWood.color.set(night ? '#7b747a' : '#bfa48a')
    outline.color.set(w.outlineColor)
    outline.opacity = w.outlineOpacity
    outlineSoft.color.set(w.outlineColor)
    outlineSoft.opacity = w.outlineOpacity * 0.45
  }

  const allMats: THREE.Material[] = [
    plaster,
    plasterAccent,
    roof,
    road,
    roadMark,
    sidewalk,
    lawn,
    foliage,
    foliageAlt,
    foliageLight,
    trunk,
    birchBark,
    birchMark,
    water,
    waterCutaway,
    baseSlab,
    baseTop,
    windowDark,
    windowLit,
    awningAccent,
    signboard,
    utilityGreen,
    lampPost,
    lampBulb,
    lampHalo,
    human,
    carBody,
    benchWood,
    outline,
    outlineSoft,
    importedWhite,
  ]

  const dispose = () => {
    gradientMap.dispose()
    allMats.forEach((m) => m.dispose())
  }

  return {
    gradientMap,
    plaster,
    plasterAccent,
    roof,
    road,
    roadMark,
    sidewalk,
    lawn,
    foliage,
    foliageAlt,
    foliageLight,
    trunk,
    birchBark,
    birchMark,
    water,
    waterCutaway,
    baseSlab,
    baseTop,
    windowDark,
    windowLit,
    awningAccent,
    signboard,
    utilityGreen,
    lampPost,
    lampBulb,
    lampHalo,
    human,
    carBody,
    benchWood,
    outline,
    outlineSoft,
    importedWhite,
    updateWeather,
    dispose,
  }
}

export function getBankMaterialSet(bank: CelMaterialBank): Set<THREE.Material> {
  return new Set<THREE.Material>([
    bank.plaster,
    bank.plasterAccent,
    bank.roof,
    bank.road,
    bank.roadMark,
    bank.sidewalk,
    bank.lawn,
    bank.foliage,
    bank.foliageAlt,
    bank.foliageLight,
    bank.trunk,
    bank.birchBark,
    bank.birchMark,
    bank.water,
    bank.waterCutaway,
    bank.baseSlab,
    bank.baseTop,
    bank.windowDark,
    bank.windowLit,
    bank.awningAccent,
    bank.signboard,
    bank.utilityGreen,
    bank.lampPost,
    bank.lampBulb,
    bank.lampHalo,
    bank.human,
    bank.carBody,
    bank.benchWood,
    bank.outline,
    bank.outlineSoft,
    bank.importedWhite,
  ])
}

export function addCelEdges(
  mesh: THREE.Mesh,
  outlineMat: THREE.LineBasicMaterial,
  thresholdAngle = 22,
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle)
  const lines = new THREE.LineSegments(edges, outlineMat)
  lines.renderOrder = 2
  lines.raycast = () => {}
  mesh.add(lines)
  return lines
}

export function disposeObjectSubtree(root: THREE.Object3D, bankMaterials?: Set<THREE.Material>) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry?.dispose()
      if (child.material && bankMaterials) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => {
          if (!bankMaterials.has(m)) {
            m.dispose()
          }
        })
      }
    }
  })
}
