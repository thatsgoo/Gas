import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AmbienceAudioEngine } from '../engine/audioEngine'
import { extractExternalThreeHtml, tryParseNativeSketchpadHtml } from '../importer/htmlImporter'
import { importExternalModelFile } from '../importer/modelImporter'
import { getAssetDef } from '../procedural/assetCatalog'
import { useSceneStore } from '../store/useSceneStore'
import { getObjectEuler, type AssetKind, type SceneObject } from '../types/scene'
import { computeGroupBounds, computeGroupScaledPatch } from './groupTransform'
import type { HandleKind, SlicerGizmoController } from './slicerGizmo'
import { computeSnappedPosition, snapAngleRad, snapDimension } from './snapEngine'

type DragMode =
  | {
      type: 'move'
      objId: string
      startObj: SceneObject
      groupStartObjs?: SceneObject[]
      grabOffset: THREE.Vector3
      dragYPlane: THREE.Plane
    }
  | {
      type: 'lift'
      objId: string
      startObj: SceneObject
      groupStartObjs?: SceneObject[]
      dragPlane: THREE.Plane
      startHitY: number
    }
  | {
      type: 'face'
      objId: string
      handle: HandleKind
      startObj: SceneObject
      dragPlane: THREE.Plane
      startHit: THREE.Vector3
      localAxis: THREE.Vector3
      axisIndex: 0 | 1 | 2
      sign: 1 | -1
    }
  | {
      type: 'corner'
      objId: string
      startObj: SceneObject
      dragPlane: THREE.Plane
      startDist: number
    }
  | {
      type: 'group-corner'
      groupStartObjs: SceneObject[]
      pivot: [number, number, number]
      topCenter: THREE.Vector3
      dragPlane: THREE.Plane
      startDist: number
    }
  | {
      type: 'rotate'
      objId: string
      axis: 'x' | 'y' | 'z'
      startObj: SceneObject
      center: THREE.Vector3
      rotPlane: THREE.Plane
      planeU: THREE.Vector3
      planeV: THREE.Vector3
      startAngle: number
    }
  | {
      type: 'base'
      handle: HandleKind
      startWidth: number
      startDepth: number
      startOffsetX: number
      startOffsetZ: number
      startHit: THREE.Vector3
    }

export interface PointerControllerParams {
  dom: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  objectsRoot: THREE.Group
  gizmo: SlicerGizmoController
  audio: AmbienceAudioEngine
  onHoverChange: (h: HandleKind | null) => void
  onWalkLookDelta: (dx: number, dy: number) => void
  onKeySetChange: (code: string, down: boolean) => void
}

function cloneObj(o: SceneObject): SceneObject {
  return {
    ...o,
    position: [...o.position] as [number, number, number],
    size: [...o.size] as [number, number, number],
    rotation: [...getObjectEuler(o)] as [number, number, number],
  }
}

function findObjectId(obj: THREE.Object3D | null): string | null {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    if (typeof cur.userData.objectId === 'string') return cur.userData.objectId
    cur = cur.parent
  }
  return null
}

function getOtherObjectRoots(objectsRoot: THREE.Group, excludeIds: Set<string>): THREE.Object3D[] {
  return objectsRoot.children.filter((c) => !excludeIds.has(c.userData.objectId as string))
}

export function attachPointerController(p: PointerControllerParams) {
  const { dom, camera, controls, objectsRoot, gizmo, audio } = p
  const raycaster = new THREE.Raycaster()
  const downRaycaster = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  let dragMode: DragMode | null = null
  let dragDirty = false
  let hoveredHandle: HandleKind | null = null
  let walkLooking = false
  let lastWalkPt = { x: 0, y: 0 }

  const getNdc = (e: PointerEvent | MouseEvent | DragEvent) => {
    const rect = dom.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  const onPointerDown = (e: PointerEvent) => {
    const s = useSceneStore.getState()
    if (s.cameraMode === 'walk') {
      if (e.button === 0) {
        walkLooking = true
        lastWalkPt = { x: e.clientX, y: e.clientY }
      }
      return
    }
    if (e.button !== 0) return

    raycaster.setFromCamera(getNdc(e), camera)

    // 1. Base edge stretch handles
    if (s.editingBase) {
      const baseHits = raycaster.intersectObjects(gizmo.baseInteractiveMeshes, false)
      if (baseHits.length > 0) {
        const handle = baseHits[0].object.userData.handleKind as HandleKind
        const hit = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(groundPlane, hit)) {
          s.commitSnapshot()
          dragMode = {
            type: 'base',
            handle,
            startWidth: s.base.width,
            startDepth: s.base.depth,
            startOffsetX: s.base.offsetX ?? 0,
            startOffsetZ: s.base.offsetZ ?? 0,
            startHit: hit.clone(),
          }
          dragDirty = false
          controls.enabled = false
          return
        }
      }
    }

    // 2. Active-mode Gizmo Handles ONLY (Move: lift | Rotate: X/Y/Z 360° rings | Scale: 6 faces + 4 corners | Multi-Scale: 4 group corners)
    if (s.selectedId || s.selectedIds.length > 0) {
      const isMulti = s.selectedIds.length > 1
      const selObj = s.selectedId ? s.objects.find((o) => o.id === s.selectedId) : undefined
      const effectiveMode = isMulti ? (s.transformMode === 'scale' ? 'scale' : 'move') : s.transformMode
      const activeHandles = gizmo.getInteractiveMeshes(effectiveMode, isMulti)
      const gizmoHits = raycaster.intersectObjects(activeHandles, false)
      if (gizmoHits.length > 0) {
        const handle = gizmoHits[0].object.userData.handleKind as HandleKind

        if (handle.startsWith('group-corner:') && isMulti) {
          const selSet = new Set(s.selectedIds)
          const groupObjs = s.objects.filter((o) => selSet.has(o.id))
          if (groupObjs.length > 1) {
            const bounds = computeGroupBounds(groupObjs)
            const topCenter = new THREE.Vector3(bounds.pivot[0], bounds.maxY, bounds.pivot[2])
            const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -bounds.maxY)
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(dragPlane, hit)) {
              s.commitSnapshot()
              dragDirty = false
              controls.enabled = false
              dragMode = {
                type: 'group-corner',
                groupStartObjs: groupObjs.map(cloneObj),
                pivot: bounds.pivot,
                topCenter,
                dragPlane,
                startDist: Math.max(0.25, hit.distanceTo(topCenter)),
              }
              return
            }
          }
        }

        if (selObj && !selObj.locked) {
          s.commitSnapshot()
          dragDirty = false
          controls.enabled = false

          if (handle === 'lift') {
            const camDir = new THREE.Vector3()
            camera.getWorldDirection(camDir)
            const normal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize()
            if (normal.lengthSq() < 0.01) normal.set(0, 0, 1)
            const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
              normal,
              gizmoHits[0].point.clone(),
            )
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(dragPlane, hit)) {
              const selSet = new Set(s.selectedIds)
              const groupStartObjs =
                s.selectedIds.length > 1
                  ? s.objects.filter((o) => selSet.has(o.id)).map(cloneObj)
                  : undefined
              dragMode = {
                type: 'lift',
                objId: selObj.id,
                startObj: cloneObj(selObj),
                groupStartObjs,
                dragPlane,
                startHitY: hit.y,
              }
              return
            }
          } else if (handle.startsWith('rotate:')) {
            const axis = handle.slice(7) as 'x' | 'y' | 'z'
            const [rx, ry, rz] = getObjectEuler(selObj)
            const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz))
            const center = new THREE.Vector3(
              selObj.position[0],
              selObj.position[1] + selObj.size[1] / 2,
              selObj.position[2],
            )
            const localNorm =
              axis === 'x'
                ? new THREE.Vector3(1, 0, 0)
                : axis === 'y'
                  ? new THREE.Vector3(0, 1, 0)
                  : new THREE.Vector3(0, 0, 1)
            const worldNorm = localNorm.clone().applyQuaternion(quat).normalize()
            const refVec =
              Math.abs(worldNorm.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
            const planeU = new THREE.Vector3().crossVectors(worldNorm, refVec).normalize()
            const planeV = new THREE.Vector3().crossVectors(worldNorm, planeU).normalize()
            const rotPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNorm, center)
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(rotPlane, hit)) {
              const rel = hit.sub(center)
              const startAngle = Math.atan2(rel.dot(planeV), rel.dot(planeU))
              dragMode = {
                type: 'rotate',
                objId: selObj.id,
                axis,
                startObj: cloneObj(selObj),
                center,
                rotPlane,
                planeU,
                planeV,
                startAngle,
              }
              return
            }
          } else if (handle.startsWith('corner:')) {
            const plane = new THREE.Plane(
              new THREE.Vector3(0, 1, 0),
              -(selObj.position[1] + selObj.size[1]),
            )
            const hit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(plane, hit)) {
              const center = new THREE.Vector3(
                selObj.position[0],
                selObj.position[1] + selObj.size[1],
                selObj.position[2],
              )
              dragMode = {
                type: 'corner',
                objId: selObj.id,
                startObj: cloneObj(selObj),
                dragPlane: plane,
                startDist: Math.max(0.2, hit.distanceTo(center)),
              }
              return
            }
          } else if (handle.startsWith('face:')) {
            const axisChar = handle.slice(6) as 'x' | 'y' | 'z'
            const sign: 1 | -1 = handle[5] === '+' ? 1 : -1
            const axisIndex: 0 | 1 | 2 = axisChar === 'x' ? 0 : axisChar === 'y' ? 1 : 2
            const [rx, ry, rz] = getObjectEuler(selObj)
            const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz))
            const localAxis = new THREE.Vector3(
              axisIndex === 0 ? 1 : 0,
              axisIndex === 1 ? 1 : 0,
              axisIndex === 2 ? 1 : 0,
            )
              .applyQuaternion(quat)
              .normalize()

            const camDir = new THREE.Vector3()
            camera.getWorldDirection(camDir)
            let planeNormal: THREE.Vector3
            if (axisIndex === 1) {
              planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize()
              if (planeNormal.lengthSq() < 0.01) planeNormal.set(0, 0, 1)
            } else {
              planeNormal = new THREE.Vector3(0, 1, 0)
            }

            const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
              planeNormal,
              gizmoHits[0].point.clone(),
            )
            const startHit = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(dragPlane, startHit)) {
              dragMode = {
                type: 'face',
                objId: selObj.id,
                handle,
                startObj: cloneObj(selObj),
                dragPlane,
                startHit,
                localAxis,
                axisIndex,
                sign,
              }
              return
            }
          }
        }
      }
    }

    // 3. Click to Select / Ctrl+Click Multi-Select / Alt+Click Locked Object (normal clicks ignore locked objects!)
    const objHits = raycaster.intersectObjects(objectsRoot.children, true)
    if (objHits.length > 0) {
      const objMap = new Map(s.objects.map((o) => [o.id, o]))
      let hitId: string | null = null
      let hitObj: SceneObject | undefined
      for (const h of objHits) {
        const cid = findObjectId(h.object)
        if (!cid) continue
        const cand = objMap.get(cid)
        if (!cand) continue
        if (cand.locked && !e.altKey) continue // click-through locked objects unless Alt is held!
        hitId = cid
        hitObj = cand
        break
      }

      if (hitId && hitObj) {
        if (hitObj.locked) {
          // Alt+Click on locked object: select it with amber wireframe so user can inspect or unlock
          s.selectObject(hitId)
          audio.playBlockTap(0.95)
          s.showToast(`已选中锁定物体「${hitObj.name}」（点底部「解锁」或按 L 解除锁定）`)
          return
        }

        if (e.ctrlKey || e.metaKey) {
          s.toggleSelectObject(hitId)
          audio.playBlockTap(1.12)
          return
        }

        const isGroupDrag = s.selectedIds.length > 1 && s.selectedIds.includes(hitId)
        if (!isGroupDrag) {
          s.selectObject(hitId)
        }

        const nextState = useSceneStore.getState()
        const targetObj = nextState.objects.find((o) => o.id === hitId)
        if (targetObj && !targetObj.locked && (isGroupDrag || nextState.transformMode === 'move')) {
          const dragYPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetObj.position[1])
          const pt = new THREE.Vector3()
          if (raycaster.ray.intersectPlane(dragYPlane, pt)) {
            const selSet = new Set(nextState.selectedIds)
            const groupStartObjs = isGroupDrag
              ? nextState.objects.filter((o) => selSet.has(o.id) && !o.locked).map(cloneObj)
              : undefined
            dragMode = {
              type: 'move',
              objId: targetObj.id,
              startObj: cloneObj(targetObj),
              groupStartObjs,
              grabOffset: new THREE.Vector3(
                targetObj.position[0] - pt.x,
                0,
                targetObj.position[2] - pt.z,
              ),
              dragYPlane,
            }
            dragDirty = false
            controls.enabled = false
            return
          }
        }
        return
      }
    }

    if (!e.ctrlKey && !e.metaKey && (s.selectedId || s.selectedIds.length > 0)) {
      s.selectObject(null)
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const s = useSceneStore.getState()
    if (s.cameraMode === 'walk') {
      if (walkLooking) {
        p.onWalkLookDelta(e.clientX - lastWalkPt.x, e.clientY - lastWalkPt.y)
        lastWalkPt = { x: e.clientX, y: e.clientY }
      }
      return
    }

    raycaster.setFromCamera(getNdc(e), camera)

    if (!dragMode) {
      let nextHover: HandleKind | null = null
      if (s.editingBase) {
        const bh = raycaster.intersectObjects(gizmo.baseInteractiveMeshes, false)
        if (bh.length > 0) nextHover = bh[0].object.userData.handleKind as HandleKind
      } else if (s.selectedId || s.selectedIds.length > 0) {
        const isMulti = s.selectedIds.length > 1
        const primaryObj = s.selectedId ? s.objects.find((o) => o.id === s.selectedId) : undefined
        if (isMulti || (primaryObj && !primaryObj.locked)) {
          const effectiveMode = isMulti ? (s.transformMode === 'scale' ? 'scale' : 'move') : s.transformMode
          const activeHandles = gizmo.getInteractiveMeshes(effectiveMode, isMulti)
          const gh = raycaster.intersectObjects(activeHandles, false)
          if (gh.length > 0) nextHover = gh[0].object.userData.handleKind as HandleKind
        }
      }
      if (nextHover !== hoveredHandle) {
        hoveredHandle = nextHover
        dom.style.cursor = hoveredHandle ? 'pointer' : 'default'
        p.onHoverChange(hoveredHandle)
      }
      return
    }

    if (dragMode.type === 'move') {
      // Multi-Object Group Move: translate all selected objects together while preserving relative offsets
      if (dragMode.groupStartObjs && dragMode.groupStartObjs.length > 1) {
        const pt = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(dragMode.dragYPlane, pt)) {
          const rawX = pt.x + dragMode.grabOffset.x
          const rawZ = pt.z + dragMode.grabOffset.z
          const rawDx = rawX - dragMode.startObj.position[0]
          const rawDz = rawZ - dragMode.startObj.position[2]
          if (!dragDirty && Math.hypot(rawDx, rawDz) > 0.12) {
            s.commitSnapshot()
            dragDirty = true
          }
          if (dragDirty) {
            const dx = s.snapEnabled ? Math.round(rawDx * 2) / 2 : Number(rawDx.toFixed(2))
            const dz = s.snapEnabled ? Math.round(rawDz * 2) / 2 : Number(rawDz.toFixed(2))
            const startMap = new Map(dragMode.groupStartObjs.map((o) => [o.id, o]))
            const ids = dragMode.groupStartObjs.map((o) => o.id)
            s.batchUpdateObjects(
              ids,
              (o) => {
                const orig = startMap.get(o.id)
                if (!orig) return {}
                return {
                  position: [
                    Number((orig.position[0] + dx).toFixed(2)),
                    orig.position[1],
                    Number((orig.position[2] + dz).toFixed(2)),
                  ],
                }
              },
              false,
            )
            gizmo.syncGuides([], s.base)
          }
        }
        return
      }

      const attachMode = s.surfaceAttach || e.shiftKey

      // Scheme A: Magnetic Surface Attachment (hang on vertical walls OR place on any roof/surface!)
      if (attachMode) {
        const others = getOtherObjectRoots(objectsRoot, new Set([dragMode.objId]))
        const surfHits = raycaster.intersectObjects(others, true)
        const validHit = surfHits.find((h) => h.face && h.object instanceof THREE.Mesh)
        if (validHit && validHit.face) {
          if (!dragDirty) {
            s.commitSnapshot()
            dragDirty = true
          }
          const worldNormal = validHit.face.normal
            .clone()
            .transformDirection(validHit.object.matrixWorld)
            .normalize()
          const hitPt = validHit.point
          const sz = dragMode.startObj.size

          if (Math.abs(worldNormal.y) < 0.45) {
            // Vertical Wall Attachment: flush back against wall, auto-face outward, free height on wall!
            const wallYaw = Math.atan2(worldNormal.x, worldNormal.z)
            const halfDepth = sz[2] / 2 + 0.02
            const px = hitPt.x + worldNormal.x * halfDepth
            const py = Math.max(0, hitPt.y - sz[1] / 2)
            const pz = hitPt.z + worldNormal.z * halfDepth
            s.updateObject(
              dragMode.objId,
              {
                position: [Number(px.toFixed(2)), Number(py.toFixed(2)), Number(pz.toFixed(2))],
                rotationY: wallYaw,
                rotation: [0, wallYaw, 0],
              },
              false,
            )
            gizmo.syncGuides([], s.base)
            return
          } else if (worldNormal.y >= 0.45) {
            // Top Surface Attachment (roof, overpass, table, car top, imported building!)
            s.updateObject(
              dragMode.objId,
              {
                position: [
                  Number(hitPt.x.toFixed(2)),
                  Number(Math.max(0, hitPt.y).toFixed(2)),
                  Number(hitPt.z.toFixed(2)),
                ],
              },
              false,
            )
            gizmo.syncGuides([], s.base)
            return
          }
        }
      }

      // Default Horizontal Move (with automatic top-surface landing onto ANY built-in OR imported mesh!)
      const pt = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.dragYPlane, pt)) {
        const rawX = pt.x + dragMode.grabOffset.x
        const rawZ = pt.z + dragMode.grabOffset.z
        if (
          !dragDirty &&
          Math.hypot(rawX - dragMode.startObj.position[0], rawZ - dragMode.startObj.position[2]) > 0.12
        ) {
          s.commitSnapshot()
          dragDirty = true
        }
        if (dragDirty) {
          const snapped = computeSnappedPosition(
            dragMode.startObj,
            [rawX, dragMode.startObj.position[1], rawZ],
            s.objects,
            s.snapEnabled,
          )
          let finalY = snapped.position[1]

          // Raycast straight down to land smoothly on rooftops/overpasses of imported HTML/GLB models too!
          const movingDef = getAssetDef(dragMode.startObj.kind)
          if (movingDef.category !== 'streets') {
            const others = getOtherObjectRoots(objectsRoot, new Set([dragMode.objId]))
            downRaycaster.set(
              new THREE.Vector3(snapped.position[0], 400, snapped.position[2]),
              new THREE.Vector3(0, -1, 0),
            )
            const downHits = downRaycaster.intersectObjects(others, true)
            const topHit = downHits.find(
              (h) =>
                h.object instanceof THREE.Mesh &&
                h.face &&
                h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.55,
            )
            if (topHit && topHit.point.y > finalY) {
              finalY = Number(topHit.point.y.toFixed(2))
            }
          }

          s.updateObject(
            dragMode.objId,
            { position: [snapped.position[0], finalY, snapped.position[2]] },
            false,
          )
          gizmo.syncGuides(snapped.guides, s.base)
        }
      }
    } else if (dragMode.type === 'lift') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.dragPlane, hit)) {
        const rawDy = hit.y - dragMode.startHitY
        if (dragMode.groupStartObjs && dragMode.groupStartObjs.length > 1) {
          const minY = Math.min(...dragMode.groupStartObjs.map((o) => o.position[1]))
          const clampedDy = Math.max(-minY, rawDy)
          const dy = s.snapEnabled ? Math.round(clampedDy * 4) / 4 : Number(clampedDy.toFixed(2))
          const startMap = new Map(dragMode.groupStartObjs.map((o) => [o.id, o]))
          s.batchUpdateObjects(
            dragMode.groupStartObjs.map((o) => o.id),
            (o) => {
              const orig = startMap.get(o.id)
              if (!orig) return {}
              return {
                position: [
                  orig.position[0],
                  Number(Math.max(0, orig.position[1] + dy).toFixed(2)),
                  orig.position[2],
                ],
              }
            },
            false,
          )
        } else {
          const rawY = Math.max(0, dragMode.startObj.position[1] + rawDy)
          const nextY = s.snapEnabled ? Math.round(rawY * 4) / 4 : Number(rawY.toFixed(2))
          s.updateObject(
            dragMode.objId,
            { position: [dragMode.startObj.position[0], nextY, dragMode.startObj.position[2]] },
            false,
          )
        }
        dragDirty = true
      }
    } else if (dragMode.type === 'rotate') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.rotPlane, hit)) {
        const rel = hit.sub(dragMode.center)
        const curAngle = Math.atan2(rel.dot(dragMode.planeV), rel.dot(dragMode.planeU))
        let delta = curAngle - dragMode.startAngle
        if (s.snapEnabled) {
          delta = snapAngleRad(delta, true)
        }
        const [srx, sry, srz] = getObjectEuler(dragMode.startObj)
        const startQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(srx, sry, srz))
        const localAxis =
          dragMode.axis === 'x'
            ? new THREE.Vector3(1, 0, 0)
            : dragMode.axis === 'y'
              ? new THREE.Vector3(0, 1, 0)
              : new THREE.Vector3(0, 0, 1)
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(localAxis, delta)
        const nextQuat = startQuat.multiply(deltaQuat)
        const nextEuler = new THREE.Euler().setFromQuaternion(nextQuat, 'XYZ')
        const nextRot: [number, number, number] = [
          Number(nextEuler.x.toFixed(4)),
          Number(nextEuler.y.toFixed(4)),
          Number(nextEuler.z.toFixed(4)),
        ]
        s.updateObject(dragMode.objId, { rotation: nextRot, rotationY: nextRot[1] }, false)
        dragDirty = true
      }
    } else if (dragMode.type === 'face') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.dragPlane, hit)) {
        const proj = hit.clone().sub(dragMode.startHit).dot(dragMode.localAxis) * dragMode.sign
        const def = getAssetDef(dragMode.startObj.kind)
        const idx = dragMode.axisIndex
        const origSize = dragMode.startObj.size
        const origPos = dragMode.startObj.position
        const newDim = snapDimension(origSize[idx] + proj, s.snapEnabled, def.minSize[idx])
        dragDirty = true

        if (dragMode.startObj.uniformLock) {
          const ratio = Math.max(0.15, newDim / Math.max(0.1, origSize[idx]))
          const nextSize: [number, number, number] = [
            Number(Math.max(def.minSize[0], origSize[0] * ratio).toFixed(2)),
            Number(Math.max(def.minSize[1], origSize[1] * ratio).toFixed(2)),
            Number(Math.max(def.minSize[2], origSize[2] * ratio).toFixed(2)),
          ]
          s.updateObject(dragMode.objId, { size: nextSize }, false)
        } else {
          const actualDelta = newDim - origSize[idx]
          const nextSize: [number, number, number] = [...origSize] as [number, number, number]
          nextSize[idx] = newDim
          const nextPos: [number, number, number] = [...origPos] as [number, number, number]
          if (idx === 1) {
            if (dragMode.sign === -1) nextPos[1] = Number((origPos[1] - actualDelta).toFixed(2))
          } else {
            const shift = dragMode.localAxis.clone().multiplyScalar((actualDelta * dragMode.sign) / 2)
            nextPos[0] = Number((origPos[0] + shift.x).toFixed(3))
            nextPos[2] = Number((origPos[2] + shift.z).toFixed(3))
          }
          s.updateObject(dragMode.objId, { size: nextSize, position: nextPos }, false)
        }
      }
    } else if (dragMode.type === 'corner') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.dragPlane, hit)) {
        const center = new THREE.Vector3(
          dragMode.startObj.position[0],
          dragMode.startObj.position[1] + dragMode.startObj.size[1],
          dragMode.startObj.position[2],
        )
        const ratio = Math.max(0.2, hit.distanceTo(center)) / dragMode.startDist
        const def = getAssetDef(dragMode.startObj.kind)
        const orig = dragMode.startObj.size
        s.updateObject(
          dragMode.objId,
          {
            size: [
              snapDimension(orig[0] * ratio, s.snapEnabled, def.minSize[0]),
              snapDimension(orig[1] * ratio, s.snapEnabled, def.minSize[1]),
              snapDimension(orig[2] * ratio, s.snapEnabled, def.minSize[2]),
            ],
          },
          false,
        )
        dragDirty = true
      }
    } else if (dragMode.type === 'group-corner') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(dragMode.dragPlane, hit)) {
        const rawFactor = Math.max(0.1, hit.distanceTo(dragMode.topCenter) / dragMode.startDist)
        const factor = s.snapEnabled
          ? Math.max(0.1, Math.round(rawFactor * 20) / 20)
          : Number(rawFactor.toFixed(3))
        const startMap = new Map(dragMode.groupStartObjs.map((o) => [o.id, o]))
        const pivot = dragMode.pivot
        s.batchUpdateObjects(
          dragMode.groupStartObjs.map((o) => o.id),
          (o) => {
            const orig = startMap.get(o.id)
            if (!orig) return {}
            return computeGroupScaledPatch(orig, pivot, factor)
          },
          false,
        )
        dragDirty = true
      }
    } else if (dragMode.type === 'base') {
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        const dx = hit.x - dragMode.startHit.x
        const dz = hit.z - dragMode.startHit.z
        const step = s.snapEnabled ? 2 : 0.5
        const roundStep = (v: number) => Math.max(16, Math.min(1000, Math.round(v / step) * step))

        if (dragMode.handle === 'base:+x') {
          const nextW = roundStep(dragMode.startWidth + dx)
          const delta = nextW - dragMode.startWidth
          s.setBase({ width: nextW, offsetX: Number((dragMode.startOffsetX + delta / 2).toFixed(2)) }, false)
        } else if (dragMode.handle === 'base:-x') {
          const nextW = roundStep(dragMode.startWidth - dx)
          const delta = nextW - dragMode.startWidth
          s.setBase({ width: nextW, offsetX: Number((dragMode.startOffsetX - delta / 2).toFixed(2)) }, false)
        } else if (dragMode.handle === 'base:+z') {
          const nextD = roundStep(dragMode.startDepth + dz)
          const delta = nextD - dragMode.startDepth
          s.setBase({ depth: nextD, offsetZ: Number((dragMode.startOffsetZ + delta / 2).toFixed(2)) }, false)
        } else if (dragMode.handle === 'base:-z') {
          const nextD = roundStep(dragMode.startDepth - dz)
          const delta = nextD - dragMode.startDepth
          s.setBase({ depth: nextD, offsetZ: Number((dragMode.startOffsetZ - delta / 2).toFixed(2)) }, false)
        }
        dragDirty = true
      }
    }
  }

  const onPointerUp = () => {
    walkLooking = false
    if (dragMode) {
      if (dragDirty) audio.playBlockTap(dragMode.type === 'move' ? 1.0 : 1.18)
      dragMode = null
      dragDirty = false
      gizmo.syncGuides([], useSceneStore.getState().base)
      controls.enabled = useSceneStore.getState().cameraMode === 'orbit'
    }
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    const s = useSceneStore.getState()
    raycaster.setFromCamera(getNdc(e), camera)
    const pt = new THREE.Vector3(0, 0, 0)
    raycaster.ray.intersectPlane(groundPlane, pt)

    const file = e.dataTransfer?.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (ext === 'html' || ext === 'htm') {
        try {
          const text = await file.text()
          const native = tryParseNativeSketchpadHtml(text)
          if (native) {
            s.loadSerializedScene(native)
            audio.playBlockTap(1.25)
            s.showToast(`已无损还原沙盒工程「${file.name}」（保留全部参数化建筑与设置）`)
            return
          }
          s.showToast(`正在解析 Three.js HTML「${file.name}」...`)
          const extraction = await extractExternalThreeHtml(text, file.name)
          s.setPendingHtmlExtraction(extraction)
        } catch (err) {
          s.showToast(err instanceof Error ? err.message : 'HTML 场景解析失败')
        }
        return
      }
      try {
        s.showToast(`正在导入「${file.name}」并自动赛璐璐化...`)
        const { asset, wasRescaled } = await importExternalModelFile(file)
        s.registerImportedAsset(asset)
        const pos: [number, number, number] = s.snapEnabled
          ? [Math.round(pt.x * 2) / 2, 0, Math.round(pt.z * 2) / 2]
          : [Number(pt.x.toFixed(2)), 0, Number(pt.z.toFixed(2))]
        s.addAsset('imported', pos, asset.id)
        audio.playBlockTap(1.25)
        s.showToast(
          wasRescaled
            ? `已导入「${asset.name}」（已自动校准尺度与贴底）`
            : `已导入「${asset.name}」并应用纯白赛璐璐风格`,
        )
      } catch (err) {
        s.showToast(err instanceof Error ? err.message : '导入模型失败')
      }
      return
    }

    const payload = e.dataTransfer?.getData('application/x-sketchpad-asset')
    if (payload) {
      try {
        const parsed = JSON.parse(payload) as {
          kind: AssetKind
          importedAssetId?: string
          savedLibraryId?: string
        }
        if (parsed.savedLibraryId) {
          const libModel = s.savedLibrary.find((m) => m.id === parsed.savedLibraryId)
          if (libModel) {
            const dummy: SceneObject = {
              id: '__drop__',
              kind: 'imported',
              name: libModel.name,
              position: [pt.x, 0, pt.z],
              size: libModel.naturalSize,
              rotationY: 0,
              uniformLock: true,
            }
            const snapped = computeSnappedPosition(dummy, [pt.x, 0, pt.z], s.objects, s.snapEnabled)
            s.placeSavedModel(parsed.savedLibraryId, snapped.position)
            audio.playBlockTap(1.08)
          }
          return
        }
        const def = getAssetDef(parsed.kind)
        const dummy: SceneObject = {
          id: '__drop__',
          kind: parsed.kind,
          name: def.label,
          position: [pt.x, 0, pt.z],
          size: def.defaultSize,
          rotationY: 0,
          uniformLock: def.defaultUniformLock,
        }
        const snapped = computeSnappedPosition(dummy, [pt.x, 0, pt.z], s.objects, s.snapEnabled)
        s.addAsset(parsed.kind, snapped.position, parsed.importedAssetId)
        audio.playBlockTap(1.08)
      } catch {
        // ignore invalid drag payload
      }
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    p.onKeySetChange(e.code, true)
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

    const s = useSceneStore.getState()
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) s.redo()
      else s.undo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      s.redo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      if (s.cameraMode === 'orbit') {
        e.preventDefault()
        s.selectAll()
      }
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      s.duplicateSelected()
      return
    }
    if (e.code === 'Escape') {
      if (s.cameraMode === 'walk') {
        s.setCameraMode('orbit')
        s.showToast('已返回鸟瞰视角')
      } else if (s.editingBase) {
        s.setEditingBase(false)
      } else if (s.selectedId || s.selectedIds.length > 0) {
        s.selectObject(null)
      }
      return
    }
    if (s.cameraMode === 'orbit' && (s.selectedId || s.selectedIds.length > 0)) {
      const k = e.key.toLowerCase()
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        s.deleteSelected()
      } else if (k === 'w') {
        s.setTransformMode('move')
      } else if (k === 'e') {
        s.setTransformMode('rotate')
      } else if (k === 's') {
        s.setTransformMode('scale')
      } else if (k === 'l') {
        e.preventDefault()
        const targetIds = s.selectedIds.length > 0 ? s.selectedIds : s.selectedId ? [s.selectedId] : []
        if (targetIds.length > 0) {
          s.toggleLockObjects(targetIds)
          audio.playBlockTap(1.1)
        }
      } else if (k === 'r') {
        e.preventDefault()
        if (s.selectedIds.length > 1) {
          const selSet = new Set(s.selectedIds)
          const group = s.objects.filter((o) => selSet.has(o.id) && !o.locked)
          if (group.length > 0) {
            const cx = group.reduce((acc, o) => acc + o.position[0], 0) / group.length
            const cz = group.reduce((acc, o) => acc + o.position[2], 0) / group.length
            s.batchUpdateObjects(
              group.map((o) => o.id),
              (o) => {
                const dx = o.position[0] - cx
                const dz = o.position[2] - cz
                const [rx, ry, rz] = getObjectEuler(o)
                const ny = ry + Math.PI / 2
                return {
                  position: [
                    Number((cx + dz).toFixed(2)),
                    o.position[1],
                    Number((cz - dx).toFixed(2)),
                  ],
                  rotationY: ny,
                  rotation: [rx, ny, rz],
                }
              },
              true,
            )
            audio.playBlockTap(1.15)
          }
        } else {
          const sel = s.objects.find((o) => o.id === s.selectedId)
          if (sel && !sel.locked) {
            const [rx, ry, rz] = getObjectEuler(sel)
            const ny = ry + Math.PI / 2
            s.updateObject(sel.id, { rotationY: ny, rotation: [rx, ny, rz] }, true)
            audio.playBlockTap(1.15)
          }
        }
      }
    }
  }

  const onKeyUp = (e: KeyboardEvent) => p.onKeySetChange(e.code, false)

  dom.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  dom.addEventListener('dragover', onDragOver)
  dom.addEventListener('drop', onDrop)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    isDragging: () => dragMode !== null,
    dispose: () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('dragover', onDragOver)
      dom.removeEventListener('drop', onDrop)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
