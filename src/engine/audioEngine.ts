import type { WeatherPreset } from '../types/scene'

/**
 * Self-contained Web Audio API procedural soundscape engine.
 * Zero external audio assets required — works offline & inside exported standalone HTML.
 */
export class AmbienceAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private rainGain: GainNode | null = null
  private windGain: GainNode | null = null
  private cicadaGain: GainNode | null = null
  private currentWeather: WeatherPreset = 'afternoon'
  private enabled = false
  private birdTimer: number | null = null

  private ensureContext() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    this.ctx = ctx

    const master = ctx.createGain()
    master.gain.value = 0.0
    master.connect(ctx.destination)
    this.masterGain = master

    // Shared 3-second pink noise buffer
    const bufferSize = ctx.sampleRate * 3
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045
      b6 = white * 0.115926
    }

    // 1. Rain channel (bandpass + gentle high hiss)
    const rainSrc = ctx.createBufferSource()
    rainSrc.buffer = noiseBuffer
    rainSrc.loop = true
    const rainFilter = ctx.createBiquadFilter()
    rainFilter.type = 'bandpass'
    rainFilter.frequency.value = 1450
    rainFilter.Q.value = 0.55
    const rainGain = ctx.createGain()
    rainGain.gain.value = 0
    rainSrc.connect(rainFilter)
    rainFilter.connect(rainGain)
    rainGain.connect(master)
    rainSrc.start()
    this.rainGain = rainGain

    // 2. Soft wind / breeze channel (lowpass modulated subtly)
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = noiseBuffer
    windSrc.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 340
    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.14
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 120
    windLfo.connect(windLfoGain)
    windLfoGain.connect(windFilter.frequency)
    windLfo.start()
    const windGain = ctx.createGain()
    windGain.gain.value = 0
    windSrc.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(master)
    windSrc.start()
    this.windGain = windGain

    // 3. Soft warm afternoon shimmer / distant cicada bed
    const cicadaSrc = ctx.createBufferSource()
    cicadaSrc.buffer = noiseBuffer
    cicadaSrc.loop = true
    const cicadaFilter = ctx.createBiquadFilter()
    cicadaFilter.type = 'bandpass'
    cicadaFilter.frequency.value = 4400
    cicadaFilter.Q.value = 6.5
    const cicadaGain = ctx.createGain()
    cicadaGain.gain.value = 0
    cicadaSrc.connect(cicadaFilter)
    cicadaFilter.connect(cicadaGain)
    cicadaGain.connect(master)
    cicadaSrc.start()
    this.cicadaGain = cicadaGain

    // Periodic gentle dawn bird chirps when enabled + dawn
    this.birdTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx || !this.masterGain) return
      if (this.currentWeather !== 'dawn' && this.currentWeather !== 'afternoon') return
      if (Math.random() > (this.currentWeather === 'dawn' ? 0.45 : 0.18)) return
      this.triggerBirdChirp()
    }, 2600)
  }

  private triggerBirdChirp() {
    if (!this.ctx || !this.masterGain) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    const base = 2400 + Math.random() * 900
    osc.frequency.setValueAtTime(base, now)
    osc.frequency.exponentialRampToValueAtTime(base * 1.28, now + 0.08)
    osc.frequency.exponentialRampToValueAtTime(base * 0.92, now + 0.16)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.025, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(now)
    osc.stop(now + 0.21)
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (enabled) {
      this.ensureContext()
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume()
      }
    }
    this.applyMix()
  }

  public setWeather(weather: WeatherPreset) {
    this.currentWeather = weather
    this.applyMix()
  }

  private applyMix() {
    if (!this.ctx || !this.masterGain || !this.rainGain || !this.windGain || !this.cicadaGain) return
    const now = this.ctx.currentTime
    const targetMaster = this.enabled ? 0.55 : 0.0
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.35)

    const mix: Record<WeatherPreset, [number, number, number]> = {
      afternoon: [0.0, 0.24, 0.12],
      dawn: [0.0, 0.18, 0.0],
      dusk: [0.0, 0.34, 0.04],
      rain: [0.72, 0.22, 0.0],
    }
    const [r, w, c] = mix[this.currentWeather]
    this.rainGain.gain.setTargetAtTime(r, now, 0.4)
    this.windGain.gain.setTargetAtTime(w, now, 0.4)
    this.cicadaGain.gain.setTargetAtTime(c, now, 0.4)
  }

  /** Subtle wooden block tap when placing or snapping a model */
  public playBlockTap(pitch = 1.0) {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320 * pitch, now)
    osc.frequency.exponentialRampToValueAtTime(140 * pitch, now + 0.055)
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.07)
  }

  public dispose() {
    if (this.birdTimer !== null) {
      window.clearInterval(this.birdTimer)
      this.birdTimer = null
    }
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
    }
  }
}
