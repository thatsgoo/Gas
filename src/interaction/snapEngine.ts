import { getAssetDef } from '../procedural/assetCatalog'
import type { SceneObject } from '../types/scene'

export interface SnapGuide {
  axis: 'x' | 'z'
  value: number
}

export interface SnapResult {
  position: [number, number, number]
  guides: SnapGuide[]
  snapped: boolean
}

function getWorldFootprint(obj: SceneObject): { hw: number; hd: number } {
  const c = Math.abs(Math.cos(obj.rotationY))
  const s = Math.abs(Math.sin(obj.rotationY))
  const hw = (obj.size[0] * c + obj.size[2] * s) / 2
  const hd = (obj.size[0] * s + obj.size[2] * c) / 2
  return { hw, hd }
}

/**
 * Smart Auto-Snap Engine:
 * - Grid snap (0.5m)
 * - Flush edge-to-edge alignment & centerline snap with nearby buildings/roads
 * - Vertical stacking onto top of stackable surfaces when dragged over them
 */
export function computeSnappedPosition(
  moving: SceneObject,
  rawPos: [number, number, number],
  allObjects: SceneObject[],
  snapEnabled: boolean,
): SnapResult {
  if (!snapEnabled) {
    return {
      position: [rawPos[0], Math.max(0, rawPos[1]), rawPos[2]],
      guides: [],
      snapped: false,
    }
  }

  const gridStep = 0.5
  let x = Math.round(rawPos[0] / gridStep) * gridStep
  let z = Math.round(rawPos[2] / gridStep) * gridStep
  let y = 0

  const { hw, hd } = getWorldFootprint(moving)
  const edgeThreshold = 0.85
  let bestDx = edgeThreshold
  let bestDz = edgeThreshold
  let guideX: number | null = null
  let guideZ: number | null = null
  let snapped = false

  let stackTopY = 0
  const movingDef = getAssetDef(moving.kind)
  const isRoadOrTerrain = movingDef.category === 'streets'

  for (const other of allObjects) {
    if (other.id === moving.id) continue
    const oFoot = getWorldFootprint(other)
    const ox = other.position[0]
    const oz = other.position[2]

    // 1. Edge-to-edge & flush alignment on X (when Z ranges are reasonably close)
    const zNear = Math.abs(z - oz) < hd + oFoot.hd + 10
    if (zNear) {
      const candidatesX: Array<[number, number]> = [
        [ox - oFoot.hw - hw, ox - oFoot.hw], // moving right face touches other left face
        [ox + oFoot.hw + hw, ox + oFoot.hw], // moving left face touches other right face
        [ox - oFoot.hw + hw, ox - oFoot.hw], // flush left edges
        [ox + oFoot.hw - hw, ox + oFoot.hw], // flush right edges
        [ox, ox], // center align
      ]
      for (const [targetX, lineX] of candidatesX) {
        const d = Math.abs(rawPos[0] - targetX)
        if (d < bestDx) {
          bestDx = d
          x = targetX
          guideX = lineX
          snapped = true
        }
      }
    }

    // 2. Edge-to-edge & flush alignment on Z
    const xNear = Math.abs(x - ox) < hw + oFoot.hw + 10
    if (xNear) {
      const candidatesZ: Array<[number, number]> = [
        [oz - oFoot.hd - hd, oz - oFoot.hd],
        [oz + oFoot.hd + hd, oz + oFoot.hd],
        [oz - oFoot.hd + hd, oz - oFoot.hd],
        [oz + oFoot.hd - hd, oz + oFoot.hd],
        [oz, oz],
      ]
      for (const [targetZ, lineZ] of candidatesZ) {
        const d = Math.abs(rawPos[2] - targetZ)
        if (d < bestDz) {
          bestDz = d
          z = targetZ
          guideZ = lineZ
          snapped = true
        }
      }
    }

    // 3. Vertical stacking onto stackable surfaces (buildings, plazas, blocks, roads)
    if (!isRoadOrTerrain) {
      const otherDef = getAssetDef(other.kind)
      if (otherDef.isStackableSurface) {
        const overlapX = Math.abs(x - ox) < oFoot.hw - 0.15
        const overlapZ = Math.abs(z - oz) < oFoot.hd - 0.15
        if (overlapX && overlapZ) {
          const topY = other.position[1] + other.size[1]
          if (topY > stackTopY) {
            stackTopY = topY
            snapped = true
          }
        }
      }
    }
  }

  y = stackTopY

  const guides: SnapGuide[] = []
  if (guideX !== null) guides.push({ axis: 'x', value: guideX })
  if (guideZ !== null) guides.push({ axis: 'z', value: guideZ })

  return {
    position: [Number(x.toFixed(3)), Number(y.toFixed(3)), Number(z.toFixed(3))],
    guides,
    snapped,
  }
}

export function snapDimension(val: number, snapEnabled: boolean, minVal: number): number {
  const clamped = Math.max(minVal, val)
  if (!snapEnabled) return Number(clamped.toFixed(2))
  return Number(Math.max(minVal, Math.round(clamped * 2) / 2).toFixed(2))
}

export function snapAngleRad(rad: number, snapEnabled: boolean): number {
  if (!snapEnabled) return rad
  const step = Math.PI / 12 // 15 degrees
  return Math.round(rad / step) * step
}
