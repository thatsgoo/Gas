import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { ImportedAsset, ImportedCelMode, SceneObject, SerializedScene } from '../types/scene'

interface DuckAttr {
  array: ArrayLike<number>
  itemSize?: number
  normalized?: boolean
}

interface DuckGeometry {
  attributes?: Record<string, DuckAttr>
  index?: { array: ArrayLike<number> } | null
  groups?: Array<{ start: number; count: number; materialIndex?: number }>
}

interface DuckTexture {
  image?: HTMLCanvasElement | HTMLImageElement | ImageBitmap | null
  repeat?: { x: number; y: number }
  offset?: { x: number; y: number }
  wrapS?: number
  wrapT?: number
  flipY?: boolean
  colorSpace?: string
}

interface DuckMaterial {
  color?: { r: number; g: number; b: number }
  emissive?: { r: number; g: number; b: number }
  emissiveIntensity?: number
  map?: DuckTexture | null
  opacity?: number
  transparent?: boolean
  vertexColors?: boolean
  side?: number
  depthWrite?: boolean
  isShaderMaterial?: boolean
  fragmentShader?: string
  uniforms?: Record<string, { value?: unknown }>
}

interface DuckObject3D {
  name?: string
  type?: string
  visible?: boolean
  isScene?: boolean
  isMesh?: boolean
  isInstancedMesh?: boolean
  isLight?: boolean
  isCamera?: boolean
  isPoints?: boolean
  isLine?: boolean
  isLineSegments?: boolean
  isSprite?: boolean
  count?: number
  instanceMatrix?: { array: ArrayLike<number> }
  instanceColor?: { array: ArrayLike<number> } | null
  geometry?: DuckGeometry
  material?: DuckMaterial | DuckMaterial[]
  matrixWorld?: { elements: ArrayLike<number> }
  children?: DuckObject3D[]
  updateMatrixWorld?: (force?: boolean) => void
}

export interface ExtractedHtmlNode {
  id: string
  name: string
  group: THREE.Group
  position: [number, number, number]
  size: [number, number, number]
  triangleCount: number
  isLikelyEnvironment: boolean
}

export interface ExternalHtmlExtraction {
  fileName: string
  /** Smart deep-decomposed sub-objects (e.g. individual poles, vending machines, bikes, buildings) */
  deepNodes: ExtractedHtmlNode[]
  /** Top-level category groups as authored in the source HTML */
  topNodes: ExtractedHtmlNode[]
  totalTriangles: number
}

/**
 * Layer 0: Detect and parse our own exported Atmosphere Sketchpad standalone HTML losslessly.
 */
export function tryParseNativeSketchpadHtml(htmlText: string): SerializedScene | null {
  const tagMatch = htmlText.match(
    /<script[^>]*id=["']atmosphere-scene-data["'][^>]*>([\s\S]*?)<\/script>/i,
  )
  if (tagMatch?.[1]) {
    try {
      const parsed = JSON.parse(tagMatch[1].trim()) as SerializedScene
      if (parsed && parsed.version === 1 && Array.isArray(parsed.objects)) {
        return parsed
      }
    } catch {
      // fall through
    }
  }

  const assignMarker = 'window.__ATMOSPHERE_SCENE__ = '
  const idx = htmlText.indexOf(assignMarker)
  if (idx !== -1) {
    const start = idx + assignMarker.length
    const endScript = htmlText.indexOf('</script>', start)
    if (endScript !== -1) {
      const raw = htmlText.slice(start, endScript).trim().replace(/;\s*$/, '')
      try {
        const parsed = JSON.parse(raw) as SerializedScene
        if (parsed && parsed.version === 1 && Array.isArray(parsed.objects)) {
          return parsed
        }
      } catch {
        // not native JSON
      }
    }
  }

  return null
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Transforms both unbundled AI Three.js scripts (UMD/ESM) AND Vite/Rollup/Webpack
 * bundled single-file Three.js builds (`this.isScene=!0`) so scenes are captured cleanly!
 */
function transformScriptSource(src: string): string {
  let code = src

  // A. Universal hook for bundled/minified Three.js single-file HTMLs (Vite/Webpack/Rollup/esbuild)
  if (/this\.isScene\s*=\s*(?:!0|true)\b/.test(code)) {
    code = code.replace(
      /this\.isScene\s*=\s*(?:!0|true)\b/g,
      (m) => `(${m},__CTX__.capture(this))`,
    )
    code = code.replace(
      /this\.isWebGLRenderer\s*=\s*(?:!0|true)\b/g,
      (m) => `(${m},__CTX__.captureRenderer(this))`,
    )
    return code
  }

  // B. Unbundled AI scripts: rewrite ESM imports against our local zero-CDN __CTX__
  code = code.replace(
    /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]*three[^'"]*['"]\s*;?/gi,
    'var $1 = __CTX__.THREE;',
  )
  code = code.replace(
    /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]*three(?:\.module)?(?:\.min)?(?:\.js)?['"]\s*;?/gi,
    'var $1 = __CTX__.THREE;',
  )
  code = code.replace(
    /import\s*\{([^}]+)\}\s*from\s+['"]([^'"]*)['"]\s*;?/gi,
    (_full, specifiers: string, modPath: string) => {
      const normalized = specifiers.replace(/\bas\b/g, ':')
      if (/orbitcontrols/i.test(modPath)) return `var {${normalized}} = __CTX__.addons;`
      if (/three/i.test(modPath)) {
        if (/addons|examples\/jsm/i.test(modPath)) return `var {${normalized}} = __CTX__.addons;`
        return `var {${normalized}} = __CTX__.THREE;`
      }
      return `var {${normalized}} = __CTX__.addons;`
    },
  )
  code = code.replace(
    /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]*OrbitControls[^'"]*['"]\s*;?/gi,
    'var $1 = __CTX__.addons.OrbitControls;',
  )
  code = code.replace(/^\s*import\s+[^;]+;?/gm, '')
  code = code.replace(/\bexport\s+default\s+/g, '')
  code = code.replace(/\bexport\s+(?=(?:const|let|var|function|class)\b)/g, '')

  return code
}

function isSkipNode(node: DuckObject3D): boolean {
  if (node.visible === false) return true
  if (node.isLight || node.isCamera || node.isPoints || node.isSprite || node.isLine || node.isLineSegments) {
    return true
  }
  const t = (node.type ?? '').toLowerCase()
  if (t.includes('helper') || t.includes('light') || t.includes('camera')) return true
  const n = (node.name ?? '').toLowerCase()
  if (n.includes('helper') || n.includes('gizmo')) return true
  return false
}

function isColorLike(v: unknown): v is { r: number; g: number; b: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { r?: unknown }).r === 'number' &&
    typeof (v as { g?: unknown }).g === 'number' &&
    typeof (v as { b?: unknown }).b === 'number'
  )
}

function extractShaderPrimaryColor(mat: DuckMaterial): THREE.Color | null {
  const u = mat.uniforms
  if (!u) return null
  const preferred = [
    'uBaseColor',
    'uColor',
    'uMainColor',
    'uShallowColor',
    'uDeepColor',
    'uDiffuse',
    'baseColor',
    'color',
  ]
  for (const k of preferred) {
    const val = u[k]?.value
    if (isColorLike(val)) return new THREE.Color(val.r, val.g, val.b)
  }
  for (const key of Object.keys(u)) {
    const val = u[key]?.value
    if (isColorLike(val)) return new THREE.Color(val.r, val.g, val.b)
  }
  return null
}

function cloneDuckTexture(srcTex: DuckTexture | null | undefined, texCache: Map<unknown, THREE.Texture>): THREE.Texture | null {
  if (!srcTex || !srcTex.image) return null
  const img = srcTex.image
  if (
    !(img instanceof HTMLCanvasElement) &&
    !(img instanceof HTMLImageElement) &&
    !(typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)
  ) {
    return null
  }
  const existing = texCache.get(srcTex)
  if (existing) return existing

  const tex = new THREE.Texture(img)
  tex.colorSpace = srcTex.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace
  if (typeof srcTex.wrapS === 'number') tex.wrapS = srcTex.wrapS as THREE.Wrapping
  if (typeof srcTex.wrapT === 'number') tex.wrapT = srcTex.wrapT as THREE.Wrapping
  if (srcTex.repeat) tex.repeat.set(srcTex.repeat.x, srcTex.repeat.y)
  if (srcTex.offset) tex.offset.set(srcTex.offset.x, srcTex.offset.y)
  if (typeof srcTex.flipY === 'boolean') tex.flipY = srcTex.flipY
  tex.needsUpdate = true
  texCache.set(srcTex, tex)
  return tex
}

function cloneSingleMaterial(
  m: DuckMaterial | undefined,
  texCache: Map<unknown, THREE.Texture>,
): THREE.MeshStandardMaterial {
  const shaderCol = m?.isShaderMaterial ? extractShaderPrimaryColor(m) : null
  const color = isColorLike(m?.color)
    ? new THREE.Color(m.color.r, m.color.g, m.color.b)
    : shaderCol ?? new THREE.Color('#ece7dc')

  // Also grab texture map from ShaderMaterial uniforms (e.g. uAlbedo / uMap / uTex) if present!
  let rawMap = m?.map ?? null
  if (!rawMap && m?.isShaderMaterial && m.uniforms) {
    for (const k of Object.keys(m.uniforms)) {
      const v = m.uniforms[k]?.value as DuckTexture | undefined
      if (v && typeof v === 'object' && v.image instanceof HTMLCanvasElement && !/puddle|mask|rough/i.test(k)) {
        rawMap = v
        break
      }
    }
  }
  const map = cloneDuckTexture(rawMap, texCache)
  const opacity = m && typeof m.opacity === 'number' ? m.opacity : 1
  const transparent = Boolean(m?.transparent && opacity < 0.99)
  const vertexColors = Boolean(m?.vertexColors)

  return new THREE.MeshStandardMaterial({
    color,
    map,
    roughness: 0.85,
    metalness: 0.0,
    transparent,
    opacity,
    vertexColors,
  })
}

function cloneMaterialClean(
  src: DuckMaterial | DuckMaterial[] | undefined,
  texCache: Map<unknown, THREE.Texture>,
): THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] {
  if (Array.isArray(src)) {
    return src.map((m) => cloneSingleMaterial(m, texCache))
  }
  return cloneSingleMaterial(src, texCache)
}

function isVisualFxOrOutlineMesh(mesh: DuckObject3D): boolean {
  const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
  if (mats.length === 0) return false

  // 1. Inverted-hull cel outline shell or BackSide sky dome (THREE.BackSide === 1)
  if (mats.every((m) => m && m.side === 1)) return true

  // 2. Non-depth-writing ShaderMaterial atmospheric planes (mist, god rays, rain halos, sky)
  if (
    mats.every(
      (m) => m?.isShaderMaterial && (m.depthWrite === false || (m.transparent && !m.map)),
    )
  ) {
    const frag = (mats[0].fragmentShader ?? '').toLowerCase()
    const isSurfaceLike =
      frag.includes('ripple') ||
      frag.includes('water') ||
      frag.includes('pond') ||
      frag.includes('puddle') ||
      frag.includes('albedo')
    if (!isSurfaceLike) return true
  }

  return false
}

function cloneDuckGeometry(srcGeo: DuckGeometry): THREE.BufferGeometry | null {
  const attrs = srcGeo.attributes
  if (!attrs?.position?.array) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(attrs.position.array), attrs.position.itemSize || 3),
  )
  if (attrs.normal?.array) {
    geo.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(attrs.normal.array), attrs.normal.itemSize || 3),
    )
  }
  if (attrs.uv?.array) {
    geo.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(attrs.uv.array), attrs.uv.itemSize || 2),
    )
  }
  if (attrs.color?.array) {
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(
        new Float32Array(attrs.color.array),
        attrs.color.itemSize || 3,
        Boolean(attrs.color.normalized),
      ),
    )
  }
  if (srcGeo.index?.array) {
    const idxSrc = srcGeo.index.array
    let maxIdx = 0
    for (let i = 0; i < idxSrc.length; i++) if (idxSrc[i] > maxIdx) maxIdx = idxSrc[i]
    const idxArr = maxIdx > 65535 ? new Uint32Array(idxSrc) : new Uint16Array(idxSrc)
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1))
  }
  if (srcGeo.groups && srcGeo.groups.length > 0) {
    for (const grp of srcGeo.groups) {
      geo.addGroup(grp.start, grp.count, grp.materialIndex)
    }
  }
  if (!geo.attributes.normal) geo.computeVertexNormals()
  return geo
}

function collectMeshesBaked(
  node: DuckObject3D,
  outGroup: THREE.Group,
  stats: { triangles: number },
  texCache: Map<unknown, THREE.Texture>,
) {
  if (isSkipNode(node)) return

  if (node.isInstancedMesh && node.geometry && node.instanceMatrix?.array) {
    if (!isVisualFxOrOutlineMesh(node)) {
      const baseGeo = cloneDuckGeometry(node.geometry)
      if (baseGeo) {
        const worldMat = new THREE.Matrix4()
        if (node.matrixWorld?.elements) worldMat.fromArray(Array.from(node.matrixWorld.elements))
        const baseMat = cloneSingleMaterial(
          Array.isArray(node.material) ? node.material[0] : node.material,
          texCache,
        )
        const count = Math.min(node.count ?? 0, 250)
        const instArr = node.instanceMatrix.array
        const colArr = node.instanceColor?.array ?? null
        const instMat = new THREE.Matrix4()
        const colorMatCache = new Map<string, THREE.MeshStandardMaterial>()

        for (let i = 0; i < count; i++) {
          instMat.fromArray(Array.from({ length: 16 }, (_, k) => instArr[i * 16 + k]))
          const g = baseGeo.clone()
          g.applyMatrix4(instMat).applyMatrix4(worldMat)
          if (!g.attributes.normal) g.computeVertexNormals()

          let meshMat = baseMat
          if (colArr) {
            const ic = new THREE.Color(colArr[i * 3], colArr[i * 3 + 1], colArr[i * 3 + 2])
            const finalCol = baseMat.color.clone().multiply(ic)
            const key = finalCol.getHexString()
            let cached = colorMatCache.get(key)
            if (!cached) {
              cached = baseMat.clone()
              cached.color.copy(finalCol)
              colorMatCache.set(key, cached)
            }
            meshMat = cached
          }

          outGroup.add(new THREE.Mesh(g, meshMat))
          stats.triangles += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3
        }
        baseGeo.dispose()
      }
    }
  } else if (node.isMesh && node.geometry) {
    if (!isVisualFxOrOutlineMesh(node)) {
      const g = cloneDuckGeometry(node.geometry)
      if (g) {
        const worldMat = new THREE.Matrix4()
        if (node.matrixWorld?.elements) worldMat.fromArray(Array.from(node.matrixWorld.elements))
        g.applyMatrix4(worldMat)
        if (!g.attributes.normal) g.computeVertexNormals()
        outGroup.add(new THREE.Mesh(g, cloneMaterialClean(node.material, texCache)))
        stats.triangles += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3
      }
    }
  }

  if (node.children) {
    for (const child of node.children) {
      collectMeshesBaked(child, outGroup, stats, texCache)
    }
  }
}

function normalizeExtractedGroup(
  rawGroup: THREE.Group,
  name: string,
  index: number,
  stats: { triangles: number },
): ExtractedHtmlNode | null {
  if (rawGroup.children.length === 0) return null

  const box = new THREE.Box3().setFromObject(rawGroup)
  if (box.isEmpty()) return null

  const sizeVec = new THREE.Vector3()
  const centerVec = new THREE.Vector3()
  box.getSize(sizeVec)
  box.getCenter(centerVec)

  const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z)
  if (!Number.isFinite(maxDim) || maxDim < 0.02) return null

  const lower = name.toLowerCase()
  const isFxName = /(rain|atmosphere|fx|effect|mist|fog|cloud|skybox|skydome|weather|particle)/i.test(lower)
  const isNameEnv = /\b(sky|ground|groundplane|floor|terrain|plane)\b/.test(lower)
  const isGiantFlatGround = sizeVec.y < 0.35 && sizeVec.x > 80 && sizeVec.z > 80 && box.max.y < 1.2
  const isGiantSky = maxDim > 110 && sizeVec.y > 70
  const isLikelyEnvironment = isFxName || isGiantSky || isGiantFlatGround || (isNameEnv && maxDim > 70)

  const offset = new THREE.Vector3(-centerVec.x, -box.min.y, -centerVec.z)
  const centeredGroup = new THREE.Group()
  for (const child of [...rawGroup.children]) {
    if (child instanceof THREE.Mesh) {
      child.geometry.translate(offset.x, offset.y, offset.z)
      centeredGroup.add(child)
    }
  }

  return {
    id: `ext_${index}_${Date.now().toString(36)}`,
    name: name.trim() || `场景物体 ${index + 1}`,
    group: centeredGroup,
    position: [
      Number(centerVec.x.toFixed(2)),
      Number(box.min.y.toFixed(2)),
      Number(centerVec.z.toFixed(2)),
    ],
    size: [
      Math.max(0.25, Number(sizeVec.x.toFixed(2))),
      Math.max(0.25, Number(sizeVec.y.toFixed(2))),
      Math.max(0.25, Number(sizeVec.z.toFixed(2))),
    ],
    triangleCount: Math.round(stats.triangles),
    isLikelyEnvironment,
  }
}

/**
 * Layer 1: Universal Zero-CDN Virtual Three.js Runner!
 * Supports BOTH:
 * - Unbundled AI Three.js scripts (UMD `window.THREE`, ESM `import * as THREE`, `importmap`)
 * - Minified / Vite-bundled single-file HTMLs (`this.isScene=!0` / `this.isWebGLRenderer=!0`)!
 */
export async function extractExternalThreeHtml(
  htmlText: string,
  fileName: string,
): Promise<ExternalHtmlExtraction> {
  const parser = new DOMParser()
  const parsedDoc = parser.parseFromString(htmlText, 'text/html')

  const scriptEls = Array.from(parsedDoc.querySelectorAll('script'))
  const inlineBlocks: string[] = []
  for (const el of scriptEls) {
    const type = (el.getAttribute('type') ?? '').toLowerCase()
    if (
      type === 'importmap' ||
      type === 'application/json' ||
      type === 'x-shader/x-vertex' ||
      type === 'x-shader/x-fragment'
    ) {
      continue
    }
    if (el.getAttribute('src')) continue
    const txt = el.textContent?.trim()
    if (txt) inlineBlocks.push(transformScriptSource(txt))
  }

  if (inlineBlocks.length === 0) {
    throw new Error('未在 HTML 中找到内联 JavaScript 代码，无法解析 3D 场景')
  }

  const capturedScenes: DuckObject3D[] = []
  const capturedRenderers: Array<{ dispose?: () => void; forceContextLoss?: () => void }> = []

  const captureScene = (sc: unknown) => {
    if (sc && typeof sc === 'object' && (sc as DuckObject3D).isScene) {
      const d = sc as DuckObject3D
      if (!capturedScenes.includes(d)) capturedScenes.push(d)
    }
  }
  const captureRenderer = (r: unknown) => {
    if (r && typeof r === 'object') {
      capturedRenderers.push(r as { dispose?: () => void; forceContextLoss?: () => void })
    }
  }

  class CapturingScene extends THREE.Scene {
    constructor() {
      super()
      captureScene(this)
    }
  }

  class VirtualWebGLRenderer {
    isWebGLRenderer = true
    domElement: HTMLCanvasElement
    shadowMap = { enabled: false, type: THREE.PCFSoftShadowMap, autoUpdate: true, needsUpdate: false }
    toneMapping = THREE.NoToneMapping
    toneMappingExposure = 1
    outputColorSpace = THREE.SRGBColorSpace
    outputEncoding = 3001
    physicallyCorrectLights = false
    info = { render: {}, memory: {} }
    capabilities = { isWebGL2: true, maxTextures: 16 }

    constructor(opts?: { canvas?: HTMLCanvasElement }) {
      this.domElement = opts?.canvas ?? document.createElement('canvas')
      this.domElement.width = 1280
      this.domElement.height = 800
    }
    setSize(w: number, h: number) {
      this.domElement.width = w
      this.domElement.height = h
    }
    setPixelRatio() {}
    setClearColor() {}
    setViewport() {}
    setScissor() {}
    setScissorTest() {}
    clear() {}
    dispose() {}
    compile() {}
    setAnimationLoop(cb: ((t: number) => void) | null) {
      if (cb) {
        try {
          cb(16)
        } catch {
          // ignore
        }
      }
    }
    render(scene: THREE.Scene) {
      captureScene(scene)
    }
    getContext() {
      return null
    }
  }

  class MockOrbitControls {
    target = new THREE.Vector3()
    enableDamping = true
    dampingFactor = 0.05
    maxPolarAngle = Math.PI
    minDistance = 0
    maxDistance = Infinity
    autoRotate = false
    autoRotateSpeed = 1
    enabled = true
    update() {}
    dispose() {}
    addEventListener() {}
    removeEventListener() {}
  }

  class MockRenderPass {
    constructor(scene?: THREE.Scene) {
      if (scene) captureScene(scene)
    }
  }

  class MockEffectComposer {
    addPass() {}
    render() {}
    setSize() {}
    setPixelRatio() {}
  }

  const threeShim = {
    ...THREE,
    Scene: CapturingScene,
    WebGLRenderer: VirtualWebGLRenderer,
    OrbitControls: MockOrbitControls,
  }

  const addonsBase: Record<string, unknown> = {
    OrbitControls: MockOrbitControls,
    MapControls: MockOrbitControls,
    RenderPass: MockRenderPass,
    EffectComposer: MockEffectComposer,
  }
  const addonsProxy = new Proxy(addonsBase, {
    get(target, prop) {
      if (prop in target) return target[prop as string]
      return class DummyAddon {
        constructor(...args: unknown[]) {
          for (const a of args) captureScene(a)
        }
        update() {}
        dispose() {}
        render() {}
        setSize() {}
      }
    },
  })

  const sandboxRoot = document.createElement('div')
  const sandboxBody = document.createElement('div')
  sandboxRoot.appendChild(sandboxBody)
  const parsedBody = parsedDoc.body
  if (parsedBody) {
    for (const child of Array.from(parsedBody.children)) {
      if (child.tagName.toLowerCase() !== 'script') {
        sandboxBody.appendChild(child.cloneNode(true))
      }
    }
  }

  const readyCallbacks: Array<() => void> = []

  const mockDocument = new Proxy(document, {
    get(target, prop) {
      if (prop === 'body') return sandboxBody
      if (prop === 'readyState') return 'complete'
      if (prop === 'getElementById') {
        return (id: string) =>
          sandboxRoot.querySelector(`#${CSS.escape(id)}`) ?? document.createElement('div')
      }
      if (prop === 'querySelector') {
        return (sel: string) => sandboxRoot.querySelector(sel) ?? document.createElement('div')
      }
      if (prop === 'querySelectorAll') {
        return (sel: string) => sandboxRoot.querySelectorAll(sel)
      }
      if (prop === 'addEventListener') {
        return (ev: string, fn: () => void) => {
          if (ev === 'DOMContentLoaded' || ev === 'load') readyCallbacks.push(fn)
        }
      }
      if (prop === 'removeEventListener') return () => {}
      const val = Reflect.get(target, prop)
      return typeof val === 'function' ? val.bind(target) : val
    },
  })

  let rafCount = 0
  const mockRaf = (cb: FrameRequestCallback) => {
    if (rafCount < 2) {
      rafCount++
      try {
        cb(rafCount * 16)
      } catch {
        // ignore
      }
    }
    return rafCount
  }

  const mockWindowState: Record<string, unknown> = {
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    THREE: threeShim,
    document: mockDocument,
    requestAnimationFrame: mockRaf,
    cancelAnimationFrame: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: (fn: () => void, ms?: number) => {
      if (typeof fn === 'function' && (!ms || ms <= 150)) {
        try {
          fn()
        } catch {
          // ignore
        }
      }
      return 0
    },
    clearTimeout: () => {},
    addEventListener: (ev: string, fn: () => void) => {
      if (ev === 'load' || ev === 'DOMContentLoaded') readyCallbacks.push(fn)
    },
    removeEventListener: () => {},
    onload: null,
  }

  const mockWindow = new Proxy(mockWindowState, {
    get(target, prop) {
      if (prop in target) return target[prop as string]
      const val = Reflect.get(window, prop)
      return typeof val === 'function' ? val.bind(window) : val
    },
    set(target, prop, value) {
      target[prop as string] = value
      return true
    },
  })

  const ctx = {
    THREE: threeShim,
    addons: addonsProxy,
    capture: captureScene,
    captureRenderer,
  }

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...vals: unknown[]) => Promise<void>

  let runError: string | null = null
  const combinedSource = `var THREE = __CTX__.THREE;\n${inlineBlocks.join('\n;\n')}`

  try {
    const runner = new AsyncFunction(
      '__CTX__',
      'window',
      'self',
      'globalThis',
      'document',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'setInterval',
      'setTimeout',
      combinedSource,
    )
    await runner(
      ctx,
      mockWindow,
      mockWindow,
      mockWindow,
      mockDocument,
      mockRaf,
      () => {},
      () => 0,
      mockWindowState.setTimeout,
    )
    if (typeof mockWindowState.onload === 'function') {
      ;(mockWindowState.onload as () => void)()
    }
    for (const cb of readyCallbacks) {
      try {
        cb()
      } catch {
        // ignore secondary listener errors
      }
    }
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err)
  } finally {
    // Release any WebGL context created by bundled Three.js immediately!
    for (const r of capturedRenderers) {
      try {
        r.dispose?.()
        r.forceContextLoss?.()
      } catch {
        // ignore
      }
    }
  }

  if (capturedScenes.length === 0) {
    throw new Error(
      runError
        ? `解析 HTML 失败：${runError}`
        : '未在该 HTML 中检测到 Three.js 场景（请确认文件内包含 Three.js 代码）',
    )
  }

  let bestScene = capturedScenes[0]
  for (const sc of capturedScenes) {
    if ((sc.children?.length ?? 0) > (bestScene.children?.length ?? 0)) bestScene = sc
  }
  bestScene.updateMatrixWorld?.(true)

  const meaningfulTop = (bestScene.children ?? []).filter((c) => {
    if (isSkipNode(c)) return false
    if (c.isMesh && isVisualFxOrOutlineMesh(c)) return false
    return true
  })

  let candidates: DuckObject3D[] = meaningfulTop
  if (
    meaningfulTop.length === 1 &&
    (meaningfulTop[0].children?.length ?? 0) > 1 &&
    !meaningfulTop[0].isMesh
  ) {
    candidates = meaningfulTop[0].children!
  }

  const texCache = new Map<unknown, THREE.Texture>()
  const topNodes: ExtractedHtmlNode[] = []
  const deepNodes: ExtractedHtmlNode[] = []
  const looseSmallGroup = new THREE.Group()
  const looseSmallStats = { triangles: 0 }
  let totalTriangles = 0

  const extractSingleChild = (nodeObj: DuckObject3D, label: string, idxKey: number): ExtractedHtmlNode | null => {
    const tempGroup = new THREE.Group()
    const stats = { triangles: 0 }
    collectMeshesBaked(nodeObj, tempGroup, stats, texCache)
    return normalizeExtractedGroup(tempGroup, label, idxKey, stats)
  }

  candidates.forEach((child, idx) => {
    if (isSkipNode(child)) return
    const isCompoundGroup = !child.isMesh && (child.children?.length ?? 0) > 0
    const parentLabel =
      child.name || (isCompoundGroup ? `场景组件 ${idx + 1}` : `实体模型 ${idx + 1}`)

    // 1. Always build Top-Level node first
    const topNode = extractSingleChild(child, parentLabel, idx)
    if (!topNode) return
    totalTriangles += topNode.triangleCount

    // Cluster tiny unnamed scattered top-level props when scene already has many top children (> 24)
    const maxTopDim = Math.max(...topNode.size)
    if (candidates.length > 24 && !child.name && maxTopDim < 2.2) {
      for (const m of [...topNode.group.children]) looseSmallGroup.add(m)
      looseSmallStats.triangles += topNode.triangleCount
      return
    }

    topNodes.push(topNode)

    // 2. Build Smart Deep-Decomposed nodes!
    // If FX/Env group or single leaf mesh, keep as-is
    if (topNode.isLikelyEnvironment || !isCompoundGroup) {
      deepNodes.push(topNode)
      return
    }

    const directChildren = (child.children ?? []).filter((c) => !isSkipNode(c))
    const subGroups = directChildren.filter((c) => !c.isMesh && (c.children?.length ?? 0) > 0)
    const leafMeshes = directChildren.filter((c) => c.isMesh)

    // Case A: Prop / Category Folder Container (e.g. StreetProps with many independent sub-Groups!)
    const isPropFolder = subGroups.length >= 2 && leafMeshes.length <= 10
    if (isPropFolder) {
      let subIdx = 0
      for (const sg of subGroups) {
        subIdx++
        const sgLabel = sg.name || `${parentLabel} · 物件 ${subIdx}`
        const extracted = extractSingleChild(sg, sgLabel, idx * 100 + subIdx)
        if (extracted) deepNodes.push(extracted)
      }
      if (leafMeshes.length > 0) {
        const remGroup = new THREE.Group()
        const remStats = { triangles: 0 }
        for (const lm of leafMeshes) collectMeshesBaked(lm, remGroup, remStats, texCache)
        const remNode = normalizeExtractedGroup(remGroup, `${parentLabel} · 零散件`, idx * 100 + 99, remStats)
        if (remNode) deepNodes.push(remNode)
      }
      return
    }

    // Case B: Mixed Container (e.g. BaseAndStreet holding a standalone alley building Group, or KonbiniInterior holding shelves/counters)
    const isExteriorBuilding = /(exterior|building|house|shop|tower|cafe|store)/i.test(parentLabel)
    if (subGroups.length >= 1 && !isExteriorBuilding) {
      const keptGroup = new THREE.Group()
      const keptStats = { triangles: 0 }
      for (const lm of leafMeshes) collectMeshesBaked(lm, keptGroup, keptStats, texCache)

      const extractedSubs: ExtractedHtmlNode[] = []
      subGroups.forEach((sg, sIdx) => {
        const sgTemp = new THREE.Group()
        const sgStats = { triangles: 0 }
        collectMeshesBaked(sg, sgTemp, sgStats, texCache)
        if (sgTemp.children.length === 0) return

        const b = new THREE.Box3().setFromObject(sgTemp)
        const sz = new THREE.Vector3()
        b.getSize(sz)
        const minHoriz = Math.min(sz.x, sz.z)
        const isStandalone = (sz.y >= 1.2 || Math.max(sz.x, sz.z) >= 1.6) && minHoriz >= 0.22

        if (isStandalone) {
          const sgLabel = sg.name || `${parentLabel} · 子物体 ${sIdx + 1}`
          const node = normalizeExtractedGroup(sgTemp, sgLabel, idx * 100 + sIdx + 1, sgStats)
          if (node) extractedSubs.push(node)
        } else {
          for (const m of [...sgTemp.children]) keptGroup.add(m)
          keptStats.triangles += sgStats.triangles
        }
      })

      if (extractedSubs.length > 0) {
        const baseRemain = normalizeExtractedGroup(keptGroup, parentLabel, idx, keptStats)
        if (baseRemain) deepNodes.push(baseRemain)
        deepNodes.push(...extractedSubs)
        return
      }
    }

    // Default: keep cohesive building intact (e.g. KonbiniExterior stays 1 whole convenience store!)
    deepNodes.push(topNode)
  })

  if (looseSmallGroup.children.length > 0) {
    const looseNode = normalizeExtractedGroup(
      looseSmallGroup,
      '细节配景合集',
      candidates.length + 1,
      looseSmallStats,
    )
    if (looseNode) {
      topNodes.push(looseNode)
      deepNodes.push(looseNode)
    }
  }

  if (deepNodes.length === 0 && topNodes.length === 0) {
    throw new Error(
      runError
        ? `捕获到场景但未提取到网格（脚本报错：${runError}）`
        : '已捕获到 Three.js 场景，但里面没有可提取的 3D 网格物体',
    )
  }

  return { fileName, deepNodes, topNodes, totalTriangles }
}

async function exportGroupToGlbBase64(group: THREE.Group): Promise<string> {
  const exporter = new GLTFExporter()
  const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      group,
      (res) => {
        if (res instanceof ArrayBuffer) resolve(res)
        else reject(new Error('GLB 打包失败'))
      },
      (err) => reject(err),
      { binary: true },
    )
  })
  return arrayBufferToBase64(glbBuffer)
}

export async function finalizeExtractedHtmlNodes(
  extraction: ExternalHtmlExtraction,
  opts: {
    mode: 'deep' | 'top' | 'merge'
    celMode: ImportedCelMode
    skipEnvironment: boolean
    autoScaleIfHuge: boolean
  },
): Promise<{
  assets: ImportedAsset[]
  objects: SceneObject[]
  suggestedBase?: { width: number; depth: number; offsetX: number; offsetZ: number }
}> {
  const sourceNodes = opts.mode === 'top' ? extraction.topNodes : extraction.deepNodes
  let chosen = opts.skipEnvironment
    ? sourceNodes.filter((n) => !n.isLikelyEnvironment)
    : [...sourceNodes]

  if (chosen.length === 0) chosen = [...sourceNodes]

  const effectiveMode = opts.mode !== 'merge' && chosen.length > 200 ? 'merge' : opts.mode

  const assets: ImportedAsset[] = []
  const objects: SceneObject[] = []
  const cleanFileBase = extraction.fileName.replace(/\.[^.]+$/, '')

  if (effectiveMode === 'merge') {
    const merged = new THREE.Group()
    for (const node of chosen) {
      const g = node.group.clone(true)
      g.position.set(...node.position)
      g.updateMatrixWorld(true)
      merged.add(g)
    }
    const box = new THREE.Box3().setFromObject(merged)
    const sizeVec = new THREE.Vector3()
    const centerVec = new THREE.Vector3()
    box.getSize(sizeVec)
    box.getCenter(centerVec)

    const rebased = new THREE.Group()
    merged.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        const geo = c.geometry.clone()
        geo.applyMatrix4(c.matrixWorld)
        geo.translate(-centerVec.x, -box.min.y, -centerVec.z)
        rebased.add(new THREE.Mesh(geo, c.material))
      }
    })

    const naturalSize: [number, number, number] = [
      Math.max(0.5, Number(sizeVec.x.toFixed(2))),
      Math.max(0.5, Number(sizeVec.y.toFixed(2))),
      Math.max(0.5, Number(sizeVec.z.toFixed(2))),
    ]
    const glbBase64 = await exportGroupToGlbBase64(rebased)
    const assetId = `html_${Date.now().toString(36)}`
    assets.push({
      id: assetId,
      name: cleanFileBase,
      originalFormat: 'html',
      glbBase64,
      naturalSize,
    })
    objects.push({
      id: `obj_${assetId}`,
      kind: 'imported',
      name: cleanFileBase,
      position: [Number(centerVec.x.toFixed(2)), 0, Number(centerVec.z.toFixed(2))],
      size: naturalSize,
      rotationY: 0,
      uniformLock: true,
      celMode: opts.celMode,
      importedAssetId: assetId,
    })
  } else {
    const globalMinY = Math.min(...chosen.map((n) => n.position[1]))
    for (let i = 0; i < chosen.length; i++) {
      const node = chosen[i]
      const glbBase64 = await exportGroupToGlbBase64(node.group)
      const assetId = `html_${Date.now().toString(36)}_${i}`
      assets.push({
        id: assetId,
        name: node.name,
        originalFormat: 'html',
        glbBase64,
        naturalSize: [...node.size] as [number, number, number],
      })
      objects.push({
        id: `obj_${assetId}`,
        kind: 'imported',
        name: node.name,
        position: [
          node.position[0],
          Number(Math.max(0, node.position[1] - globalMinY).toFixed(2)),
          node.position[2],
        ],
        size: [...node.size] as [number, number, number],
        rotationY: 0,
        uniformLock: false,
        celMode: opts.celMode,
        importedAssetId: assetId,
      })
    }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const o of objects) {
    minX = Math.min(minX, o.position[0] - o.size[0] / 2)
    maxX = Math.max(maxX, o.position[0] + o.size[0] / 2)
    minZ = Math.min(minZ, o.position[2] - o.size[2] / 2)
    maxZ = Math.max(maxZ, o.position[2] + o.size[2] / 2)
  }

  let suggestedBase: { width: number; depth: number; offsetX: number; offsetZ: number } | undefined
  if (Number.isFinite(minX) && Number.isFinite(maxX)) {
    const spanX = Math.ceil((maxX - minX + 16) / 4) * 4
    const spanZ = Math.ceil((maxZ - minZ + 16) / 4) * 4
    if (spanX > 60 || spanZ > 60) {
      suggestedBase = {
        width: Math.min(1000, Math.max(60, spanX)),
        depth: Math.min(1000, Math.max(60, spanZ)),
        offsetX: Math.round((minX + maxX) / 2),
        offsetZ: Math.round((minZ + maxZ) / 2),
      }
    }
  }

  return { assets, objects, suggestedBase }
}
