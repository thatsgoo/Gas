import * as THREE from 'three'
import type { WeatherConfig } from './weatherPresets'

export function createCelSkyDome(weather: WeatherConfig) {
  const geo = new THREE.SphereGeometry(1900, 32, 20)
  const uniforms = {
    uTopColor: { value: new THREE.Color(weather.skyTop) },
    uHorizonColor: { value: new THREE.Color(weather.skyHorizon) },
    uBottomColor: { value: new THREE.Color(weather.skyBottom) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() },
    uSunColor: { value: new THREE.Color(weather.sunColor) },
    uIsNight: { value: weather.hudTheme === 'night' ? 1.0 : 0.0 },
  }

  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uBottomColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uIsNight;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = dir.y;
        float up = clamp(h * 1.45, 0.0, 1.0);
        float stepped = mix(up, floor(up * 6.0 + 0.5) / 6.0, 0.28);
        vec3 col = h >= 0.0
          ? mix(uHorizonColor, uTopColor, pow(stepped, 0.78))
          : mix(uHorizonColor, uBottomColor, clamp(-h * 3.0, 0.0, 1.0));

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float disc = smoothstep(0.9965, 0.9978, sunDot);
        float halo = smoothstep(0.94, 0.995, sunDot) * (uIsNight > 0.5 ? 0.14 : 0.22);
        col = mix(col, uSunColor, clamp(halo + disc * (uIsNight > 0.5 ? 0.45 : 0.85), 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = -10
  mesh.raycast = () => {}

  return {
    mesh,
    update(w: WeatherConfig, sunDir: THREE.Vector3) {
      uniforms.uTopColor.value.set(w.skyTop)
      uniforms.uHorizonColor.value.set(w.skyHorizon)
      uniforms.uBottomColor.value.set(w.skyBottom)
      uniforms.uSunColor.value.set(w.sunColor)
      uniforms.uSunDir.value.copy(sunDir).normalize()
      uniforms.uIsNight.value = w.hudTheme === 'night' ? 1.0 : 0.0
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}

export function createCelRainSystem(count = 650, span = 110, height = 56) {
  const positions = new Float32Array(count * 6)
  const speeds = new Float32Array(count)
  const streakLen = 2.3
  const slantX = 0.28

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * span
    const y = Math.random() * height
    const z = (Math.random() - 0.5) * span
    speeds[i] = 28 + Math.random() * 14
    const idx = i * 6
    positions[idx] = x
    positions[idx + 1] = y
    positions[idx + 2] = z
    positions[idx + 3] = x - slantX
    positions[idx + 4] = y - streakLen
    positions[idx + 5] = z
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({
    color: '#d8e8ff',
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  })
  const lines = new THREE.LineSegments(geo, mat)
  lines.visible = false
  lines.frustumCulled = false
  lines.raycast = () => {}

  return {
    lines,
    setVisible(visible: boolean) {
      lines.visible = visible
    },
    update(dt: number) {
      if (!lines.visible) return
      const attr = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < count; i++) {
        const idx = i * 6
        const dy = speeds[i] * dt
        arr[idx] -= slantX * dy * 0.14
        arr[idx + 1] -= dy
        if (arr[idx + 1] < 0) {
          arr[idx] = (Math.random() - 0.5) * span
          arr[idx + 1] = height
          arr[idx + 2] = (Math.random() - 0.5) * span
        }
        arr[idx + 3] = arr[idx] - slantX
        arr[idx + 4] = arr[idx + 1] - streakLen
        arr[idx + 5] = arr[idx + 2]
      }
      attr.needsUpdate = true
    },
    dispose() {
      geo.dispose()
      mat.dispose()
    },
  }
}
