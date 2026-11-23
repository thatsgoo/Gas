import type { WeatherPreset } from '../types/scene'

export interface WeatherConfig {
  id: WeatherPreset
  label: string
  shortLabel: string
  hudTheme: 'day' | 'night'
  skyTop: string
  skyHorizon: string
  skyBottom: string
  fogColor: string
  fogNear: number
  fogFar: number
  sunColor: string
  sunIntensity: number
  sunElevationDeg: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  outlineColor: string
  outlineOpacity: number
  /** Building plaster tint multiplier */
  plasterColor: string
  roofColor: string
  roadColor: string
  sidewalkColor: string
  foliageColor: string
  foliageAltColor: string
  waterColor: string
  waterOpacity: number
  baseSlabColor: string
  baseTopColor: string
  windowDarkColor: string
  windowLitColor: string
  windowGlowStrength: number
  lampGlowStrength: number
  rainEnabled: boolean
  ripplesEnabled: boolean
  wetSheen: number
}

export const WEATHER_PRESETS: Record<WeatherPreset, WeatherConfig> = {
  afternoon: {
    id: 'afternoon',
    label: '午后树影',
    shortLabel: '午后',
    hudTheme: 'day',
    skyTop: '#6ab0de',
    skyHorizon: '#dff0fa',
    skyBottom: '#f7f4ec',
    fogColor: '#e4f0f7',
    fogNear: 95,
    fogFar: 260,
    sunColor: '#fff6df',
    sunIntensity: 1.55,
    sunElevationDeg: 52,
    hemiSky: '#c7e3ff',
    hemiGround: '#8fa9c4',
    hemiIntensity: 1.05,
    outlineColor: '#3d4c5c',
    outlineOpacity: 0.78,
    plasterColor: '#fbf8f1',
    roofColor: '#eae3d6',
    roadColor: '#a7adb3',
    sidewalkColor: '#e8e4da',
    foliageColor: '#8eb897',
    foliageAltColor: '#6f9c7f',
    waterColor: '#7dc3dc',
    waterOpacity: 0.84,
    baseSlabColor: '#dfd9cc',
    baseTopColor: '#f3efe6',
    windowDarkColor: '#688299',
    windowLitColor: '#ffe7a8',
    windowGlowStrength: 0.0,
    lampGlowStrength: 0.0,
    rainEnabled: false,
    ripplesEnabled: false,
    wetSheen: 0.0,
  },
  dawn: {
    id: 'dawn',
    label: '清晨薄雾',
    shortLabel: '清晨',
    hudTheme: 'day',
    skyTop: '#8aa9cf',
    skyHorizon: '#f4dfd9',
    skyBottom: '#eef0f4',
    fogColor: '#e8e5eb',
    fogNear: 42,
    fogFar: 145,
    sunColor: '#ffdcc4',
    sunIntensity: 1.25,
    sunElevationDeg: 22,
    hemiSky: '#f0dce8',
    hemiGround: '#9aa8bf',
    hemiIntensity: 1.15,
    outlineColor: '#565d73',
    outlineOpacity: 0.62,
    plasterColor: '#f8f5f2',
    roofColor: '#e5dfe2',
    roadColor: '#a6a8b5',
    sidewalkColor: '#e7e4e8',
    foliageColor: '#91b3a3',
    foliageAltColor: '#75998d',
    waterColor: '#8dbdd4',
    waterOpacity: 0.82,
    baseSlabColor: '#ded9e0',
    baseTopColor: '#f1eef2',
    windowDarkColor: '#7c8ca3',
    windowLitColor: '#ffdfa0',
    windowGlowStrength: 0.15,
    lampGlowStrength: 0.25,
    rainEnabled: false,
    ripplesEnabled: false,
    wetSheen: 0.0,
  },
  dusk: {
    id: 'dusk',
    label: '黄金黄昏',
    shortLabel: '黄昏',
    hudTheme: 'day',
    skyTop: '#4e5d8c',
    skyHorizon: '#f2a979',
    skyBottom: '#e5b89e',
    fogColor: '#e6b79c',
    fogNear: 75,
    fogFar: 220,
    sunColor: '#ffb570',
    sunIntensity: 1.65,
    sunElevationDeg: 17,
    hemiSky: '#f5b78c',
    hemiGround: '#605a84',
    hemiIntensity: 0.92,
    outlineColor: '#3f3554',
    outlineOpacity: 0.82,
    plasterColor: '#f9f1e8',
    roofColor: '#dfcfc4',
    roadColor: '#8d8896',
    sidewalkColor: '#ded3cc',
    foliageColor: '#7fa187',
    foliageAltColor: '#61826e',
    waterColor: '#7da1bd',
    waterOpacity: 0.85,
    baseSlabColor: '#d1c2bc',
    baseTopColor: '#ece1d8',
    windowDarkColor: '#555d7a',
    windowLitColor: '#ffd480',
    windowGlowStrength: 0.65,
    lampGlowStrength: 0.72,
    rainEnabled: false,
    ripplesEnabled: false,
    wetSheen: 0.15,
  },
  rain: {
    id: 'rain',
    label: '潮湿雨夜',
    shortLabel: '雨夜',
    hudTheme: 'night',
    skyTop: '#141a33',
    skyHorizon: '#2a3759',
    skyBottom: '#1c243d',
    fogColor: '#222d4a',
    fogNear: 52,
    fogFar: 175,
    sunColor: '#7ea4db',
    sunIntensity: 0.85,
    sunElevationDeg: 40,
    hemiSky: '#4e6796',
    hemiGround: '#1a2038',
    hemiIntensity: 0.95,
    outlineColor: '#12182b',
    outlineOpacity: 0.86,
    plasterColor: '#c9d4e3',
    roofColor: '#9aa7bc',
    roadColor: '#4c576e',
    sidewalkColor: '#8d99ad',
    foliageColor: '#49706a',
    foliageAltColor: '#385754',
    waterColor: '#3c678a',
    waterOpacity: 0.88,
    baseSlabColor: '#525f78',
    baseTopColor: '#7e8ba3',
    windowDarkColor: '#2c3952',
    windowLitColor: '#ffcf70',
    windowGlowStrength: 1.0,
    lampGlowStrength: 1.0,
    rainEnabled: true,
    ripplesEnabled: true,
    wetSheen: 0.75,
  },
}

export const WEATHER_LIST: WeatherConfig[] = [
  WEATHER_PRESETS.afternoon,
  WEATHER_PRESETS.dawn,
  WEATHER_PRESETS.dusk,
  WEATHER_PRESETS.rain,
]
