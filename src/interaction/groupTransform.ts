import * as THREE from 'three'
import { getObjectEuler, type SceneObject } from '../types/scene'

export interface GroupBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  sizeX: number
  sizeY: number
  sizeZ: number
  /** Bottom-center anchor of the whole selected group: [cx, minY, cz] */
  pivot: [number, number, number]
}

/**
 * Computes the exact world-space AABB enclosing all selected objects (accounting for rotation).
 */
export function computeGroupBounds(objs: SceneObject[]): GroupBounds {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  const euler = new THREE.Euler()
  const corner = new THREE.Vector3()

  for (const o of objs) {
    const [rx, ry, rz] = getObjectEuler(o)
    euler.set(rx, ry, rz, 'XYZ')
    const [px, py, pz] = o.position
    const [sx, sy, sz] = o.size
    const hx = sx / 2
    const hz = sz / 2

    for (const dx of [-hx, hx]) {
      for (const dy of [0, sy]) {
        for (const dz of [-hz, hz]) {
          corner.set(dx, dy, dz).applyEuler(euler)
          const wx = px + corner.x
          const wy = py + corner.y
          const wz = pz + corner.z
          if (wx < minX) minX = wx
          if (wx > maxX) maxX = wx
          if (wy < minY) minY = wy
          if (wy > maxY) maxY = wy
          if (wz < minZ) minZ = wz
          if (wz > maxZ) maxZ = wz
        }
      }
    }
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
      minZ: 0,
      maxZ: 1,
      sizeX: 1,
      sizeY: 1,
      sizeZ: 1,
      pivot: [0, 0, 0],
    }
  }

  const sizeX = Math.max(0.2, maxX - minX)
  const sizeY = Math.max(0.2, maxY - minY)
  const sizeZ = Math.max(0.2, maxZ - minZ)
  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    sizeX,
    sizeY,
    sizeZ,
    pivot: [(minX + maxX) / 2, minY, (minZ + maxZ) / 2],
  }
}

/**
 * Computes scaled position & size for an object within a uniformly scaled group
 * anchored at the shared bottom-center pivot (cx, minY, cz).
 */
export function computeGroupScaledPatch(
  orig: SceneObject,
  pivot: [number, number, number],
  rawFactor: number,
): Partial<SceneObject> {
  const factor = Math.max(0.05, Math.min(20, rawFactor))
  const nx = pivot[0] + (orig.position[0] - pivot[0]) * factor
  const ny = Math.max(0, pivot[1] + (orig.position[1] - pivot[1]) * factor)
  const nz = pivot[2] + (orig.position[2] - pivot[2]) * factor

  const sx = Math.max(0.08, Math.min(500, orig.size[0] * factor))
  const sy = Math.max(0.08, Math.min(500, orig.size[1] * factor))
  const sz = Math.max(0.08, Math.min(500, orig.size[2] * factor))

  return {
    position: [Number(nx.toFixed(2)), Number(ny.toFixed(2)), Number(nz.toFixed(2))],
    size: [Number(sx.toFixed(2)), Number(sy.toFixed(2)), Number(sz.toFixed(2))],
  }
}
