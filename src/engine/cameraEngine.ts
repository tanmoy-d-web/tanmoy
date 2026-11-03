/**
 * Core Computational Photography & Camera Engine
 * Pure, deterministic functions for exposure physics, 20 photographic styles/filters,
 * Stamp Studio formatting, 14-parameter non-destructive image adjustments,
 * optical focal length equivalents, and EXIF synthesis.
 */

export type CameraMode =
  | 'Time-lapse'
  | 'Slo-mo'
  | 'Cinematic'
  | 'Video'
  | 'Photo'
  | 'Portrait'
  | 'Night'
  | 'Panorama'
  | 'Pro';

export type PhotographicStyleId =
  | 'standard'
  | 'rich_contrast'
  | 'vibrant'
  | 'warm'
  | 'cool'
  | 'original'
  | 'dramatic'
  | 'mono';

export interface PhotographicStylePreset {
  id: PhotographicStyleId;
  name: string;
  defaultTone: number; // -100..100
  defaultWarmth: number; // -100..100
  mappedFilterId: FilterId;
}

export const PHOTOGRAPHIC_STYLES: PhotographicStylePreset[] = [
  { id: 'standard', name: 'Standard', defaultTone: 0, defaultWarmth: 0, mappedFilterId: 'natural' },
  { id: 'rich_contrast', name: 'Rich Contrast', defaultTone: -45, defaultWarmth: 0, mappedFilterId: 'deep_contrast' },
  { id: 'vibrant', name: 'Vibrant', defaultTone: 45, defaultWarmth: 10, mappedFilterId: 'vivid' },
  { id: 'warm', name: 'Warm', defaultTone: 10, defaultWarmth: 50, mappedFilterId: 'vivid_warm' },
  { id: 'cool', name: 'Cool', defaultTone: 10, defaultWarmth: -50, mappedFilterId: 'vivid_cool' },
  { id: 'original', name: 'Original', defaultTone: 0, defaultWarmth: 0, mappedFilterId: 'original' },
  { id: 'dramatic', name: 'Dramatic', defaultTone: -35, defaultWarmth: -10, mappedFilterId: 'dramatic' },
  { id: 'mono', name: 'Mono', defaultTone: -20, defaultWarmth: 0, mappedFilterId: 'mono' },
];

export type FlashMode = 'Auto' | 'On' | 'Off';
export type TimerSeconds = 0 | 3 | 5 | 10;
export type AspectRatioOption = '4:3' | '16:9' | '1:1' | 'Full';
export type VideoResolution = '720p' | '1080p' | '4K';
export type VideoFps = 24 | 30 | 60 | 120 | 240;
export type WhiteBalancePreset =
  | 'Auto'
  | 'Daylight'
  | 'Cloudy'
  | 'Shade'
  | 'Tungsten'
  | 'Fluorescent'
  | 'Manual';

import {
  ALL_PHOTOGRAPHIC_FILTERS,
  type FilterCategory,
  type FilterDefinition as MasterFilterDef,
} from './filtersData';

export type { FilterCategory };
export type FilterDefinition = MasterFilterDef;
export type FilterId = string;

export const PHOTOGRAPHIC_FILTERS: FilterDefinition[] = ALL_PHOTOGRAPHIC_FILTERS;

export interface ProControlsState {
  iso: 'Auto' | number; // 50..6400
  shutterSpeed: 'Auto' | string; // e.g., '1/1000', '1/250', '1/60', '1/15', '1/4', '1s'
  focusDistance: 'Auto' | number; // 0.0 (macro) to 1.0 (infinity)
  whiteBalance: WhiteBalancePreset;
  kelvin: number; // 2500..9000K
  ev: number; // -3.0 .. +3.0
  rawDng: boolean;
  histogramEnabled: boolean;
  focusPeakingEnabled?: boolean;
  focusPeakingColor?: 'green' | 'red' | 'yellow' | 'cyan';
}

export interface StampSettings {
  enabled: boolean;
  showDate: boolean;
  showTime: boolean;
  showDeviceModel: boolean;
  deviceModelText: string;
  customText: string;
  showGps: boolean;
  gpsCoordinates: string;
  locationName: string;
  showLogo: boolean;
  logoStyle: 'iCam Ring' | 'Leica Dot' | 'Aperture Blade' | 'Minimal Pro';
  fontFamily: 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Serif Classic';
  fontSize: number; // 12..32
  textColor: string;
  opacity: number; // 0.2..1.0
  showBackground: boolean;
  showBorder: boolean;
  showShadow: boolean;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center';
  customPosition?: { x: number; y: number }; // normalized 0..1
  dateFormat: 'YYYY.MM.DD' | 'DD MMM YYYY' | 'MM/DD/YYYY' | 'ISO-8601';
}

export type CurvesChannel = 'RGB' | 'Red' | 'Green' | 'Blue';

export interface CurvePoint {
  x: number; // 0..255
  y: number; // 0..255
}

export interface CurvesData {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export const DEFAULT_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 64, y: 64 },
  { x: 128, y: 128 },
  { x: 192, y: 192 },
  { x: 255, y: 255 },
];

export type HslColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';

export const HSL_COLOR_NAMES: { id: HslColor; label: string; swatch: string }[] = [
  { id: 'red', label: 'Red', swatch: '#EF4444' },
  { id: 'orange', label: 'Orange', swatch: '#F97316' },
  { id: 'yellow', label: 'Yellow', swatch: '#EAB308' },
  { id: 'green', label: 'Green', swatch: '#22C55E' },
  { id: 'aqua', label: 'Aqua', swatch: '#06B6D4' },
  { id: 'blue', label: 'Blue', swatch: '#3B82F6' },
  { id: 'purple', label: 'Purple', swatch: '#A855F7' },
  { id: 'magenta', label: 'Magenta', swatch: '#EC4899' },
];

export type HslAdjustments = Record<HslColor, { hue: number; sat: number; lum: number }>;

export const DEFAULT_HSL_ADJUSTMENTS: HslAdjustments = {
  red: { hue: 0, sat: 0, lum: 0 },
  orange: { hue: 0, sat: 0, lum: 0 },
  yellow: { hue: 0, sat: 0, lum: 0 },
  green: { hue: 0, sat: 0, lum: 0 },
  aqua: { hue: 0, sat: 0, lum: 0 },
  blue: { hue: 0, sat: 0, lum: 0 },
  purple: { hue: 0, sat: 0, lum: 0 },
  magenta: { hue: 0, sat: 0, lum: 0 },
};

export interface ColorWheelVal {
  hue: number; // 0..360
  sat: number; // 0..100
  lum: number; // -100..100
}

export interface ColorGradingData {
  shadows: ColorWheelVal;
  midtones: ColorWheelVal;
  highlights: ColorWheelVal;
  balance: number; // -100..100
}

export const DEFAULT_COLOR_GRADING: ColorGradingData = {
  shadows: { hue: 0, sat: 0, lum: 0 },
  midtones: { hue: 0, sat: 0, lum: 0 },
  highlights: { hue: 0, sat: 0, lum: 0 },
  balance: 0,
};

export type PhotoshopPresetId =
  | 'none'
  | 'portra_400'
  | 'tri_x_400'
  | 'cinestill_800t'
  | 'teal_orange'
  | 'cyberpunk'
  | 'velvia_50'
  | 'golden_hour'
  | 'infrared'
  | 'film_noir'
  | 'commercial_clean';

export interface PhotoshopPreset {
  id: PhotoshopPresetId;
  name: string;
  subtitle: string;
  category: 'Film Stock' | 'Color Grade' | 'Editorial';
  description: string;
  adjustments: Partial<PhotoAdjustments>;
}

export const PHOTOSHOP_PRESETS: PhotoshopPreset[] = [
  {
    id: 'portra_400',
    name: 'Kodak Portra 400',
    subtitle: 'Warm analog portrait tone',
    category: 'Film Stock',
    description: 'Lifted film shadows, organic grain, golden highlight warmth, soft skin tones.',
    adjustments: {
      highlights: -18,
      shadows: 26,
      contrast: -8,
      saturation: 8,
      temperature: 14,
      tint: -4,
      clarity: 10,
      grain: 28,
      vignette: 14,
    },
  },
  {
    id: 'tri_x_400',
    name: 'Kodak Tri-X 400',
    subtitle: 'Punchy photojournalism B&W',
    category: 'Film Stock',
    description: 'Deep dynamic blacks, tactile silver grain, crisp contrast and micro-definition.',
    adjustments: {
      contrast: 42,
      brightness: -4,
      saturation: -100,
      vibrance: -100,
      clarity: 32,
      grain: 48,
      vignette: 24,
      filterId: 'noir',
    },
  },
  {
    id: 'cinestill_800t',
    name: 'CineStill 800T',
    subtitle: 'Tungsten cinema halation',
    category: 'Film Stock',
    description: 'Teal/cyan midtones with incandescent red highlight blooming and high sensitivity.',
    adjustments: {
      highlights: 22,
      shadows: 18,
      contrast: 14,
      temperature: -24,
      tint: 18,
      saturation: 18,
      grain: 34,
      vignette: 20,
    },
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    subtitle: 'Hollywood cinematic grade',
    category: 'Color Grade',
    description: 'Deep cobalt teal in the shadows with radiant warm orange skin tones and amber highlights.',
    adjustments: {
      contrast: 24,
      shadows: -12,
      highlights: 14,
      saturation: 22,
      temperature: 18,
      tint: 8,
      clarity: 18,
      vignette: 18,
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    subtitle: 'Electric magenta & cyan split',
    category: 'Color Grade',
    description: 'High contrast futuristic street aesthetic with intense neon saturation.',
    adjustments: {
      contrast: 34,
      shadows: -18,
      highlights: 28,
      saturation: 45,
      temperature: -18,
      tint: 38,
      clarity: 26,
      vignette: 30,
    },
  },
  {
    id: 'velvia_50',
    name: 'Fuji Velvia 50',
    subtitle: 'Hyper-vivid landscape reversal',
    category: 'Film Stock',
    description: 'Ultra saturated emerald greens and cobalt skies with velvety shadow density.',
    adjustments: {
      contrast: 28,
      saturation: 42,
      vibrance: 36,
      definition: 22,
      temperature: -6,
      clarity: 16,
      vignette: 16,
    },
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour Glow',
    subtitle: 'Warm Mediterranean sunset',
    category: 'Editorial',
    description: 'Dreamy sun-drenched radiance with soft diffused highlight glow.',
    adjustments: {
      highlights: -12,
      shadows: 22,
      contrast: -6,
      temperature: 36,
      tint: 6,
      saturation: 18,
      brilliance: 16,
      vignette: 12,
    },
  },
  {
    id: 'infrared',
    name: 'Aerochrome Infrared',
    subtitle: 'False-color foliage pinks',
    category: 'Editorial',
    description: 'Surreal false-color aesthetic turning chlorophyll greens into vibrant magenta and crimson.',
    adjustments: {
      contrast: 36,
      saturation: 32,
      temperature: 24,
      tint: 55,
      clarity: 24,
      vignette: 22,
    },
  },
  {
    id: 'film_noir',
    name: 'Moody Film Noir',
    subtitle: 'Low-key chiaroscuro cinema',
    category: 'Editorial',
    description: 'Heavy shadow vignetting, deep rich blacks, and focused specular highlights.',
    adjustments: {
      contrast: 52,
      brightness: -16,
      saturation: -100,
      vignette: 58,
      grain: 26,
      filterId: 'silvertone',
    },
  },
  {
    id: 'commercial_clean',
    name: 'Commercial Studio',
    subtitle: 'Neutral pristine commercial grade',
    category: 'Editorial',
    description: 'Calibrated color rendition with razor-sharp micro-contrast for product and editorial.',
    adjustments: {
      contrast: 12,
      brilliance: 10,
      highlights: -8,
      shadows: 8,
      sharpness: 24,
      definition: 18,
      clarity: 14,
      saturation: 6,
    },
  },
];

export interface PhotoAdjustments {
  exposure: number; // -100..100
  brilliance: number; // -100..100
  highlights: number; // -100..100
  shadows: number; // -100..100
  contrast: number; // -100..100
  brightness: number; // -100..100
  saturation: number; // -100..100
  vibrance: number; // -100..100
  temperature: number; // -100..100
  tint: number; // -100..100
  sharpness: number; // 0..100
  definition: number; // 0..100
  noiseReduction: number; // 0..100
  vignette: number; // 0..100
  clarity?: number; // -100..100 (Photoshop Clarity)
  dehaze?: number; // -100..100 (Photoshop Dehaze)
  grain?: number; // 0..100 (Film Grain)
  grainRoughness?: number; // 0..100
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge';
  activePreset?: PhotoshopPresetId;
  curves?: CurvesData;
  hsl?: HslAdjustments;
  colorGrading?: ColorGradingData;
  straightenAngle?: number; // -45..45 degrees
  filterId: FilterId;
  filterIntensity: number; // 0..100
  cropAspect: 'Original' | '4:3' | '16:9' | '1:1' | '9:16';
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  trimStartPct?: number; // 0..100 for video
  trimEndPct?: number; // 0..100 for video
}

export const DEFAULT_PHOTO_ADJUSTMENTS: PhotoAdjustments = {
  exposure: 0,
  brilliance: 0,
  highlights: 0,
  shadows: 0,
  contrast: 0,
  brightness: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  definition: 0,
  noiseReduction: 0,
  vignette: 0,
  clarity: 0,
  dehaze: 0,
  grain: 0,
  grainRoughness: 50,
  blendMode: 'normal',
  activePreset: 'none',
  curves: {
    rgb: [...DEFAULT_CURVE_POINTS],
    red: [...DEFAULT_CURVE_POINTS],
    green: [...DEFAULT_CURVE_POINTS],
    blue: [...DEFAULT_CURVE_POINTS],
  },
  hsl: { ...DEFAULT_HSL_ADJUSTMENTS },
  colorGrading: { ...DEFAULT_COLOR_GRADING },
  straightenAngle: 0,
  filterId: 'original',
  filterIntensity: 100,
  cropAspect: 'Original',
  rotation: 0,
  flipHorizontal: false,
  trimStartPct: 0,
  trimEndPct: 100,
};

export interface ExifData {
  lensLabel: string;
  focalLengthMm: number;
  apertureFStop: number;
  iso: number;
  shutterSpeed: string;
  ev: number;
  resolutionPx: string;
  megapixels: number;
  colorSpace: 'Display P3' | 'Adobe RGB (RAW DNG)';
  timestampIso: string;
  mode: CameraMode;
  filterName: string;
}

export interface CapturedMediaItem {
  id: string;
  type: 'photo' | 'video';
  dataUrl: string;
  originalDataUrl: string;
  videoBlobUrl?: string;
  durationSec?: number;
  createdAt: number;
  favorite: boolean;
  album: 'Recents' | 'Portraits' | 'Night & Pro' | 'Favorites' | 'Videos';
  exif: ExifData;
  adjustments: PhotoAdjustments;
  stampSnapshot?: StampSettings;
}

export const SUPPORTED_ISO_VALUES = [50, 100, 200, 400, 800, 1600, 3200, 6400];
export const SUPPORTED_SHUTTER_SPEEDS = [
  '1/4000',
  '1/2000',
  '1/1000',
  '1/500',
  '1/250',
  '1/125',
  '1/60',
  '1/30',
  '1/15',
  '1/4',
  '1/2',
  '1s',
];

/**
 * Maps zoom factor (0.5x .. 10x) to 35mm equivalent focal length & aperture
 */
export function getOpticalLensSpec(zoom: number, isFrontCamera = false): {
  focalLengthMm: number;
  apertureFStop: number;
  lensName: string;
} {
  if (isFrontCamera) {
    return {
      focalLengthMm: 23,
      apertureFStop: 1.9,
      lensName: 'TrueDepth 23mm f/1.9',
    };
  }
  if (zoom < 0.95) {
    return {
      focalLengthMm: Math.round(13 * (zoom / 0.5)),
      apertureFStop: 2.2,
      lensName: 'Ultra Wide 13mm f/2.2',
    };
  }
  if (zoom < 1.95) {
    return {
      focalLengthMm: Math.round(24 * zoom),
      apertureFStop: 1.78,
      lensName: zoom >= 1.4 && zoom <= 1.6 ? 'Main 35mm f/1.78' : 'Main 24mm f/1.78',
    };
  }
  if (zoom < 2.95) {
    return {
      focalLengthMm: Math.round(24 * zoom),
      apertureFStop: 1.78,
      lensName: 'Optical 2x 48mm f/1.78',
    };
  }
  return {
    focalLengthMm: Math.round(24 * zoom),
    apertureFStop: 2.8,
    lensName: 'Telephoto 77mm f/2.8',
  };
}

/**
 * Parses shutter speed string (e.g., '1/250' or '1s') into seconds
 */
export function parseShutterSpeedSeconds(shutter: string): number {
  if (shutter.endsWith('s')) {
    const val = parseFloat(shutter.slice(0, -1));
    return Number.isFinite(val) && val > 0 ? val : 1 / 60;
  }
  if (shutter.includes('/')) {
    const [num, den] = shutter.split('/').map(Number);
    if (num > 0 && den > 0) return num / den;
  }
  return 1 / 60;
}

/**
 * Computes effective exposure multiplier (0.25 .. 2.75) from EV, Pro ISO, and Shutter Speed
 */
export function computeExposureMultiplier(
  ev: number,
  pro: ProControlsState,
  mode: CameraMode
): number {
  let stops = ev;
  if (mode === 'Pro') {
    if (pro.iso !== 'Auto') {
      // baseline ISO 200
      stops += Math.log2(pro.iso / 200) * 0.42;
    }
    if (pro.shutterSpeed !== 'Auto') {
      const sec = parseShutterSpeedSeconds(pro.shutterSpeed);
      // baseline 1/60s
      stops += Math.log2(sec / (1 / 60)) * 0.35;
    }
  } else if (mode === 'Night') {
    stops += 0.45;
  }
  const clampedStops = Math.max(-2.5, Math.min(2.5, stops));
  return Number(Math.pow(2, clampedStops * 0.55).toFixed(3));
}

/**
 * Computes White Balance Kelvin temperature from preset or manual setting
 */
export function getEffectiveKelvin(wb: WhiteBalancePreset, manualKelvin: number): number {
  switch (wb) {
    case 'Auto':
      return 5600;
    case 'Daylight':
      return 5500;
    case 'Cloudy':
      return 6500;
    case 'Shade':
      return 7500;
    case 'Tungsten':
      return 3200;
    case 'Fluorescent':
      return 4000;
    case 'Manual':
      return Math.max(2500, Math.min(9000, manualKelvin));
  }
}

/**
 * Builds a CSS filter string combining live camera exposure, active filter, and non-destructive editor adjustments
 */
export function buildCssFilterString(
  filterId: FilterId,
  filterIntensityPct: number,
  exposureMultiplier: number,
  adjustments: PhotoAdjustments = DEFAULT_PHOTO_ADJUSTMENTS,
  kelvin = 5600
): string {
  const filterDef =
    PHOTOGRAPHIC_FILTERS.find((f) => f.id === filterId) || PHOTOGRAPHIC_FILTERS[0];
  const intensity = Math.max(0, Math.min(100, filterIntensityPct)) / 100;

  // Interpolate filter parameters by intensity
  const fContrast = 1 + (filterDef.contrast - 1) * intensity;
  const fSaturation = 1 + (filterDef.saturation - 1) * intensity;
  const fBrightness = 1 + (filterDef.brightness - 1) * intensity;
  const fSepia = filterDef.sepia * intensity;
  const fHue = filterDef.hueRotate * intensity;

  // Combine with non-destructive adjustments
  const adjExposure = Math.pow(2, (adjustments.exposure / 100) * 0.65);
  const adjBrightness =
    1 + (adjustments.brightness / 100) * 0.35 + (adjustments.brilliance / 100) * 0.22;
  const adjContrast =
    1 +
    (adjustments.contrast / 100) * 0.45 +
    (adjustments.definition / 100) * 0.18 -
    (adjustments.shadows / 100) * 0.12 +
    (adjustments.highlights / 100) * 0.1;
  const adjSaturation =
    1 + (adjustments.saturation / 100) * 0.65 + (adjustments.vibrance / 100) * 0.4;

  // Kelvin shift + temperature slider
  const kelvinDelta = (kelvin - 5600) / 3400; // -1..+1
  const tempWarmth = kelvinDelta * 0.18 + (adjustments.temperature / 100) * 0.25;
  const totalSepia = Math.max(0, Math.min(1, fSepia + Math.max(0, tempWarmth)));
  const totalHue = fHue + (adjustments.tint / 100) * 18 - tempWarmth * 12;

  // Curves adjustment preview bonus
  let curveContrastBonus = 0;
  let curveBrightnessBonus = 0;
  let curveHueBonus = 0;
  if (adjustments.curves) {
    const rgbPts = adjustments.curves.rgb || DEFAULT_CURVE_POINTS;
    if (rgbPts.length >= 5) {
      const darks = rgbPts[1]?.y ?? 64;
      const lights = rgbPts[3]?.y ?? 192;
      const mids = rgbPts[2]?.y ?? 128;
      curveContrastBonus = ((lights - darks) - (192 - 64)) / 128 * 0.35;
      curveBrightnessBonus = ((mids - 128) / 128) * 0.3;
    }
    const redPts = adjustments.curves.red || DEFAULT_CURVE_POINTS;
    const bluePts = adjustments.curves.blue || DEFAULT_CURVE_POINTS;
    if (redPts.length >= 3 && bluePts.length >= 3) {
      const rMid = redPts[2]?.y ?? 128;
      const bMid = bluePts[2]?.y ?? 128;
      curveHueBonus = ((rMid - bMid) / 128) * 12;
    }
  }

  // HSL Mixer preview bonus
  let hslSatBonus = 0;
  let hslHueBonus = 0;
  if (adjustments.hsl) {
    let totalSat = 0;
    let totalHueShift = 0;
    let count = 0;
    for (const key of Object.keys(adjustments.hsl) as (keyof HslAdjustments)[]) {
      const hObj = adjustments.hsl[key];
      if (hObj) {
        totalSat += hObj.sat;
        totalHueShift += hObj.hue;
        count++;
      }
    }
    if (count > 0) {
      hslSatBonus = (totalSat / (count * 100)) * 0.5;
      hslHueBonus = (totalHueShift / count) * 0.25;
    }
  }

  // Color Grading preview bonus
  let gradeHueBonus = 0;
  if (adjustments.colorGrading) {
    const cg = adjustments.colorGrading;
    if (cg.midtones?.sat > 0) {
      gradeHueBonus += ((cg.midtones.hue - 180) / 180) * (cg.midtones.sat / 100) * 15;
    }
  }

  const finalBrightness = Math.max(
    0.2,
    Math.min(
      2.8,
      fBrightness * exposureMultiplier * adjExposure * (adjBrightness + curveBrightnessBonus)
    )
  );
  const finalContrast = Math.max(0.3, Math.min(2.8, fContrast * (adjContrast + curveContrastBonus)));
  const finalSaturation = Math.max(0, Math.min(3.0, fSaturation * (adjSaturation + hslSatBonus)));
  const totalHueAdjusted = totalHue + curveHueBonus + hslHueBonus + gradeHueBonus;

  return [
    `brightness(${finalBrightness.toFixed(3)})`,
    `contrast(${finalContrast.toFixed(3)})`,
    `saturate(${finalSaturation.toFixed(3)})`,
    `sepia(${totalSepia.toFixed(3)})`,
    `hue-rotate(${totalHueAdjusted.toFixed(1)}deg)`,
  ].join(' ');
}

/**
 * Generates a 256-entry monotonic lookup table (LUT) from curve points.
 */
export function generateCurveLut(points: { x: number; y: number }[]): Uint8Array {
  const lut = new Uint8Array(256);
  if (!points || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);

  for (let x = 0; x < 256; x++) {
    if (x <= sorted[0].x) {
      lut[x] = Math.max(0, Math.min(255, Math.round(sorted[0].y)));
      continue;
    }
    if (x >= sorted[sorted.length - 1].x) {
      lut[x] = Math.max(0, Math.min(255, Math.round(sorted[sorted.length - 1].y)));
      continue;
    }

    // Find the enclosing segment
    let p0 = sorted[0];
    let p1 = sorted[1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (x >= sorted[i].x && x <= sorted[i + 1].x) {
        p0 = sorted[i];
        p1 = sorted[i + 1];
        break;
      }
    }

    const span = Math.max(1, p1.x - p0.x);
    const t = (x - p0.x) / span;
    // Smooth Hermite interpolation (S-curve)
    const smoothT = t * t * (3 - 2 * t);
    const yVal = p0.y + (p1.y - p0.y) * smoothT;
    lut[x] = Math.max(0, Math.min(255, Math.round(yVal)));
  }

  return lut;
}

/**
 * Converts RGB (0..255) to HSL (h: 0..360, s: 0..1, l: 0..1)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

/**
 * Converts HSL (h: 0..360, s: 0..1, l: 0..1) to RGB (0..255)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return [
    Math.max(0, Math.min(255, Math.round((r + m) * 255))),
    Math.max(0, Math.min(255, Math.round((g + m) * 255))),
    Math.max(0, Math.min(255, Math.round((b + m) * 255))),
  ];
}

/**
 * Maps a Hue in degrees (0..360) to HSL color name key
 */
function getHslColorKey(hue: number): HslColor {
  const h = ((hue % 360) + 360) % 360;
  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 165) return 'green';
  if (h < 195) return 'aqua';
  if (h < 265) return 'blue';
  if (h < 295) return 'purple';
  return 'magenta';
}

/**
 * Applies tone curves, HSL mixer, and 3-way color grading directly to pixel ImageData.
 */
export function applyCurvesAndHslToImageData(
  data: Uint8ClampedArray,
  adjustments: PhotoAdjustments
): void {
  const curves = adjustments.curves;
  const hsl = adjustments.hsl;
  const grading = adjustments.colorGrading;

  // Generate LUTs for Tone Curves
  const lutRgb = curves?.rgb ? generateCurveLut(curves.rgb) : null;
  const lutRed = curves?.red ? generateCurveLut(curves.red) : null;
  const lutGreen = curves?.green ? generateCurveLut(curves.green) : null;
  const lutBlue = curves?.blue ? generateCurveLut(curves.blue) : null;

  const hasCurves = Boolean(lutRgb || lutRed || lutGreen || lutBlue);
  const hasHsl = Boolean(
    hsl &&
      Object.values(hsl).some(
        (v) => (v && (v.hue !== 0 || v.sat !== 0 || v.lum !== 0))
      )
  );
  const hasGrading = Boolean(
    grading &&
      (grading.shadows.sat > 0 ||
        grading.midtones.sat > 0 ||
        grading.highlights.sat > 0)
  );

  if (!hasCurves && !hasHsl && !hasGrading) return;

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Apply Tone Curves
    if (lutRgb) {
      r = lutRgb[r];
      g = lutRgb[g];
      b = lutRgb[b];
    }
    if (lutRed) r = lutRed[r];
    if (lutGreen) g = lutGreen[g];
    if (lutBlue) b = lutBlue[b];

    // 2. Apply HSL Mixer
    if (hasHsl && hsl) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const colorKey = getHslColorKey(h);
      const shift = hsl[colorKey];
      if (shift && (shift.hue !== 0 || shift.sat !== 0 || shift.lum !== 0)) {
        const nextH = (h + shift.hue * 0.45 + 360) % 360;
        const nextS = Math.max(0, Math.min(1, s + (shift.sat / 100) * 0.6));
        const nextL = Math.max(0, Math.min(1, l + (shift.lum / 100) * 0.35));
        const [nr, ng, nb] = hslToRgb(nextH, nextS, nextL);
        r = nr;
        g = ng;
        b = nb;
      }
    }

    // 3. Apply 3-Way Color Grading (Shadows, Midtones, Highlights)
    if (hasGrading && grading) {
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const balanceOffset = (grading.balance || 0) * 0.002;

      // Shadows
      if (grading.shadows.sat > 0 && lum < 0.45 + balanceOffset) {
        const weight = Math.max(0, 1 - lum / (0.45 + balanceOffset)) * (grading.shadows.sat / 100) * 0.35;
        const [tr, tg, tb] = hslToRgb(grading.shadows.hue, 1, 0.5);
        r = Math.min(255, Math.round(r * (1 - weight) + tr * weight));
        g = Math.min(255, Math.round(g * (1 - weight) + tg * weight));
        b = Math.min(255, Math.round(b * (1 - weight) + tb * weight));
      }

      // Highlights
      if (grading.highlights.sat > 0 && lum > 0.55 + balanceOffset) {
        const weight = Math.max(0, (lum - (0.55 + balanceOffset)) / (0.45 - balanceOffset)) * (grading.highlights.sat / 100) * 0.35;
        const [tr, tg, tb] = hslToRgb(grading.highlights.hue, 1, 0.5);
        r = Math.min(255, Math.round(r * (1 - weight) + tr * weight));
        g = Math.min(255, Math.round(g * (1 - weight) + tg * weight));
        b = Math.min(255, Math.round(b * (1 - weight) + tb * weight));
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * Formats date and time according to StampSettings
 */
export function formatStampTimestamp(
  date: Date,
  settings: Pick<StampSettings, 'showDate' | 'showTime' | 'dateFormat'>
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mmm = months[date.getMonth()];

  let datePart = '';
  if (settings.showDate) {
    switch (settings.dateFormat) {
      case 'YYYY.MM.DD':
        datePart = `${yyyy}.${mm}.${dd}`;
        break;
      case 'DD MMM YYYY':
        datePart = `${dd} ${mmm} ${yyyy}`;
        break;
      case 'MM/DD/YYYY':
        datePart = `${mm}/${dd}/${yyyy}`;
        break;
      case 'ISO-8601':
        datePart = `${yyyy}-${mm}-${dd}`;
        break;
    }
  }

  let timePart = '';
  if (settings.showTime) {
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    timePart = `${hh}:${min}:${sec}`;
  }

  return [datePart, timePart].filter(Boolean).join('  ');
}

/**
 * Builds complete Stamp text lines for rendering on preview and captured photos
 */
export function buildStampLines(settings: StampSettings, now: Date = new Date()): {
  primaryLine: string;
  secondaryLine: string;
  metaLine: string;
} {
  if (!settings.enabled) {
    return { primaryLine: '', secondaryLine: '', metaLine: '' };
  }
  const timestamp = formatStampTimestamp(now, settings);
  const primaryParts = [
    settings.showDeviceModel ? settings.deviceModelText : '',
    settings.customText.trim(),
  ].filter(Boolean);

  return {
    primaryLine: primaryParts.join(' · ') || 'iCam Pro Optical',
    secondaryLine: timestamp,
    metaLine: [
      settings.locationName.trim(),
      settings.showGps ? settings.gpsCoordinates : '',
    ]
      .filter(Boolean)
      .join('  •  '),
  };
}

// Helper for buildStampLines without method binding issues
export function formatStampPayload(settings: StampSettings, now: Date = new Date()): {
  titleLine: string;
  timestampLine: string;
  locationLine: string;
} {
  if (!settings.enabled) {
    return { titleLine: '', timestampLine: '', locationLine: '' };
  }
  const titleParts = [
    settings.showDeviceModel ? settings.deviceModelText.trim() : '',
    settings.customText.trim(),
  ].filter(Boolean);

  const timestampLine = formatStampTimestamp(now, settings);
  const locationLine = [
    settings.locationName.trim(),
    settings.showGps ? settings.gpsCoordinates.trim() : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  return {
    titleLine: titleParts.join('  |  '),
    timestampLine,
    locationLine,
  };
}

/**
 * Generates realistic EXIF metadata for a captured photo or video
 */
export function synthesizeExifData(params: {
  zoom: number;
  isFrontCamera: boolean;
  mode: CameraMode;
  pro: ProControlsState;
  ev: number;
  filterId: FilterId;
  rawEnabled: boolean;
  aspectRatio: AspectRatioOption;
}): ExifData {
  const spec = getOpticalLensSpec(params.zoom, params.isFrontCamera);
  const filter =
    PHOTOGRAPHIC_FILTERS.find((f) => f.id === params.filterId) || PHOTOGRAPHIC_FILTERS[0];

  const effectiveIso =
    params.mode === 'Pro' && params.pro.iso !== 'Auto'
      ? params.pro.iso
      : params.mode === 'Night'
        ? 1250
        : 100;

  const effectiveShutter =
    params.mode === 'Pro' && params.pro.shutterSpeed !== 'Auto'
      ? params.pro.shutterSpeed
      : params.mode === 'Night'
        ? '1/4'
        : params.mode === 'Slo-mo'
          ? '1/500'
          : '1/125';

  let resolutionPx = '4032 × 3024';
  let megapixels = 12.2;
  if (params.rawEnabled || (params.mode === 'Pro' && params.pro.rawDng)) {
    resolutionPx = '8064 × 6048';
    megapixels = 48.0;
  } else if (params.aspectRatio === '16:9') {
    resolutionPx = '4032 × 2268';
    megapixels = 9.1;
  } else if (params.aspectRatio === '1:1') {
    resolutionPx = '3024 × 3024';
    megapixels = 9.1;
  }

  return {
    lensLabel: spec.lensName,
    focalLengthMm: spec.focalLengthMm,
    apertureFStop: spec.apertureFStop,
    iso: effectiveIso,
    shutterSpeed: effectiveShutter,
    ev: Number(params.ev.toFixed(1)),
    resolutionPx,
    megapixels,
    colorSpace:
      params.rawEnabled || (params.mode === 'Pro' && params.pro.rawDng)
        ? 'Adobe RGB (RAW DNG)'
        : 'Display P3',
    timestampIso: new Date().toISOString(),
    mode: params.mode,
    filterName: filter.name,
  };
}

/**
 * Computes a 32-bin normalized luminance histogram from RGBA pixel data
 */
export function computeLuminanceHistogram(
  pixels: Uint8ClampedArray,
  bins = 32
): number[] {
  const counts = new Array(bins).fill(0);
  if (!pixels || pixels.length < 4) return counts;

  const step = Math.max(4, Math.floor(pixels.length / 4 / 512) * 4);
  for (let i = 0; i < pixels.length; i += step) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const bin = Math.min(bins - 1, Math.floor((lum / 256) * bins));
    counts[bin]++;
  }

  const maxCount = Math.max(1, ...counts);
  return counts.map((c) => Number((c / maxCount).toFixed(3)));
}

export interface ParsedExifDisplay {
  deviceModel: string;
  lensModel: string;
  focalLength35mm: string;
  apertureDisplay: string;
  isoDisplay: string;
  shutterSpeedDisplay: string;
  evDisplay: string;
  dimensionsDisplay: string;
  megapixelsDisplay: string;
  fileFormat: string;
  estimatedFileSizeMb: string;
  dateFormatted: string;
  timeFormatted: string;
  colorProfile: string;
  filterUsed: string;
  captureMode: string;
}

/**
 * Parses and formats EXIF metadata from a CapturedMediaItem (including dataURL binary size estimation)
 * for the iOS Photos-style Info Inspector overlay.
 */
export function parseExifMetadataDisplay(item: CapturedMediaItem): ParsedExifDisplay {
  const { exif, dataUrl, createdAt, type } = item;

  // Estimate file size from base64 dataUrl length or fallback to realistic size
  let sizeBytes = 2_450_000;
  if (dataUrl && dataUrl.startsWith('data:')) {
    const base64Index = dataUrl.indexOf(',');
    if (base64Index !== -1) {
      const base64Length = dataUrl.length - (base64Index + 1);
      sizeBytes = Math.round((base64Length * 3) / 4);
    }
  }
  // Scale realistic raw/high-res sensor equivalent size if ProRAW
  const isRaw = exif.colorSpace.includes('RAW');
  const displayMb = isRaw
    ? Math.max(24.2, Number(((sizeBytes / (1024 * 1024)) * 18).toFixed(1)))
    : Math.max(1.8, Number(((sizeBytes / (1024 * 1024)) * 3.8).toFixed(1)));

  const dateObj = new Date(createdAt || exif.timestampIso || Date.now());
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const shutterFormatted = exif.shutterSpeed.endsWith('s')
    ? exif.shutterSpeed
    : `${exif.shutterSpeed} s`;

  const evFormatted =
    exif.ev === 0 ? '0 EV' : exif.ev > 0 ? `+${exif.ev} EV` : `${exif.ev} EV`;

  return {
    deviceModel: 'iCam Pro Optical Engine',
    lensModel: exif.lensLabel || `Main ${exif.focalLengthMm}mm f/${exif.apertureFStop}`,
    focalLength35mm: `${exif.focalLengthMm} mm`,
    apertureDisplay: `ƒ/${exif.apertureFStop}`,
    isoDisplay: `ISO ${exif.iso}`,
    shutterSpeedDisplay: shutterFormatted,
    evDisplay: evFormatted,
    dimensionsDisplay: exif.resolutionPx,
    megapixelsDisplay: `${exif.megapixels} MP`,
    fileFormat: type === 'video' ? 'HEVC / MOV' : isRaw ? 'Apple ProRAW (DNG)' : 'HEIF / JPEG',
    estimatedFileSizeMb: `${displayMb} MB`,
    dateFormatted,
    timeFormatted,
    colorProfile: exif.colorSpace,
    filterUsed: exif.filterName || 'Original',
    captureMode: exif.mode,
  };
}

