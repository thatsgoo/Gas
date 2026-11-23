import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { CelMaterialBank } from '../engine/celMaterials'
import { addCelEdges } from '../engine/celMaterials'
import type { ImportedAsset, ImportedCelMode } from '../types/scene'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

/**
 * Normalizes any imported Three.js Group:
 * - Auto-corrects wild scales (e.g. mm-exported models > 40m or tiny < 0.3m) into sensible meters (~5m)
 * - Anchors bounding box bottom-center to local origin (0, 0, 0)
 */
function normalizeImportedRoot(root: THREE.Object3D): {
  normalized: THREE.Group
  naturalSize: [number, number, number]
  wasRescaled: boolean
} {
  root.updateMatrixWorld(true)
  const rawBox = new THREE.Box3().setFromObject(root)
  const rawSize = new THREE.Vector3()
  const rawCenter = new THREE.Vector3()
  rawBox.getSize(rawSize)
  rawBox.getCenter(rawCenter)

  const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001)
  let scaleFactor = 1
  let wasRescaled = false
  if (maxDim > 30 || maxDim < 0.4) {
    scaleFactor = 5.5 / maxDim
    wasRescaled = true
  }

  const wrapper = new THREE.Group()
  root.position.set(
    -rawCenter.x * scaleFactor,
    -rawBox.min.y * scaleFactor,
    -rawCenter.z * scaleFactor,
  )
  root.scale.multiplyScalar(scaleFactor)
  wrapper.add(root)
  wrapper.updateMatrixWorld(true)

  const finalBox = new THREE.Box3().setFromObject(wrapper)
  const finalSize = new THREE.Vector3()
  finalBox.getSize(finalSize)

  const naturalSize: [number, number, number] = [
    Math.max(0.4, Number(finalSize.x.toFixed(2))),
    Math.max(0.4, Number(finalSize.y.toFixed(2))),
    Math.max(0.4, Number(finalSize.z.toFixed(2))),
  ]

  return { normalized: wrapper, naturalSize, wasRescaled }
}

/**
 * Parses a user-dropped .glb / .gltf / .obj / .fbx file, normalizes it,
 * and exports a compact binary GLB Base64 payload for offline single-file HTML export.
 */
export async function importExternalModelFile(file: File): Promise<{
  asset: ImportedAsset
  wasRescaled: boolean
}> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const buf = await file.arrayBuffer()
  let parsedRoot: THREE.Object3D

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader()
    const gltf = await loader.parseAsync(buf, '')
    parsedRoot = gltf.scene
  } else if (ext === 'obj') {
    const text = new TextDecoder().decode(buf)
    const loader = new OBJLoader()
    parsedRoot = loader.parse(text)
  } else if (ext === 'fbx') {
    const loader = new FBXLoader()
    parsedRoot = loader.parse(buf, '')
  } else {
    throw new Error(`不支持的格式 .${ext}，请拖入 .glb / .gltf / .obj / .fbx 文件`)
  }

  const { normalized, naturalSize, wasRescaled } = normalizeImportedRoot(parsedRoot)

  // Convert normalized root into a clean binary GLB so ANY format embeds cleanly into exported HTML
  const exporter = new GLTFExporter()
  const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      normalized,
      (res) => {
        if (res instanceof ArrayBuffer) resolve(res)
        else reject(new Error('GLB 序列化失败'))
      },
      (err) => reject(err),
      { binary: true },
    )
  })

  const cleanName = file.name.replace(/\.[^.]+$/, '')
  const asset: ImportedAsset = {
    id: `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    originalFormat: ext,
    glbBase64: arrayBufferToBase64(glbBuffer),
    naturalSize,
  }

  return { asset, wasRescaled }
}

/**
 * Loads a cached/embedded ImportedAsset from its Base64 GLB and applies cel-shading!
 */
export async function instantiateImportedAsset(
  asset: ImportedAsset,
  targetSize: [number, number, number],
  celMode: ImportedCelMode,
  bank: CelMaterialBank,
): Promise<THREE.Group> {
  const loader = new GLTFLoader()
  const gltf = await loader.parseAsync(base64ToArrayBuffer(asset.glbBase64), '')
  const root = gltf.scene

  // Fit precisely to slicer bounding box targetSize while keeping bottom at Y=0
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const curSize = new THREE.Vector3()
  const curCenter = new THREE.Vector3()
  box.getSize(curSize)
  box.getCenter(curCenter)

  const sx = targetSize[0] / Math.max(0.001, curSize.x)
  const sy = targetSize[1] / Math.max(0.001, curSize.y)
  const sz = targetSize[2] / Math.max(0.001, curSize.z)

  const container = new THREE.Group()
  root.position.set(-curCenter.x * sx, -box.min.y * sy, -curCenter.z * sz)
  root.scale.set(sx, sy, sz)

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      if (celMode === 'white') {
        child.material = bank.importedWhite
      } else {
        const convertMat = (orig: THREE.Material | undefined) => {
          const origColor =
            orig && 'color' in orig && orig.color instanceof THREE.Color
              ? orig.color.clone()
              : new THREE.Color('#eae4d8')
          const origMap = orig && 'map' in orig ? (orig as THREE.MeshStandardMaterial).map : null
          const opacity = orig && typeof orig.opacity === 'number' ? orig.opacity : 1
          const transparent = Boolean(orig?.transparent && opacity < 0.99)
          return new THREE.MeshToonMaterial({
            color: origColor,
            map: origMap,
            transparent,
            opacity,
            gradientMap: bank.gradientMap,
          })
        }
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => convertMat(m))
          : convertMat(child.material)
      }
      // Subtle architectural cel edge ink on low/medium poly meshes
      const verts = child.geometry.attributes.position?.count ?? 0
      if (verts <= 18000) {
        addCelEdges(child, bank.outlineSoft, 28)
      }
    }
  })

  container.add(root)
  return container
}
