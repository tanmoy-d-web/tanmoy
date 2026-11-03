import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Crop,
  RotateCw,
  Stamp,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Eye,
  FlipHorizontal,
  Scissors,
  Check,
  Palette,
  Activity,
  Layers,
  Wand2,
  SunMedium,
  Contrast,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  buildCssFilterString,
  DEFAULT_PHOTO_ADJUSTMENTS,
  DEFAULT_CURVE_POINTS,
  applyCurvesAndHslToImageData,
  PHOTOGRAPHIC_FILTERS,
  PHOTOSHOP_PRESETS,
  HSL_COLOR_NAMES,
  type CapturedMediaItem,
  type PhotoAdjustments,
  type StampSettings,
  type CurvesChannel,
  type HslColor,
  type PhotoshopPresetId,
} from '../engine/cameraEngine';
import { drawStampOverlayOnCanvas } from '../engine/sceneSynthesizer';
import {
  GlassButton,
  GlassCircleButton,
  GlassSlider,
  triggerHaptic,
} from './GlassUI';

export interface PhotoVideoEditorModalProps {
  item: CapturedMediaItem | null;
  stamp: StampSettings;
  onClose: () => void;
  onSaveEditedItem: (updated: CapturedMediaItem, asNewCopy: boolean) => void;
  onOpenStampStudio: () => void;
}

type EditorTab =
  | 'Adjust'
  | 'Curves'
  | 'HSL'
  | 'ColorGrade'
  | 'Presets'
  | 'Filters'
  | 'Crop'
  | 'Stamp';

const ADJUSTMENT_KEYS: {
  key: keyof Pick<
    PhotoAdjustments,
    | 'exposure'
    | 'brilliance'
    | 'highlights'
    | 'shadows'
    | 'contrast'
    | 'brightness'
    | 'saturation'
    | 'vibrance'
    | 'temperature'
    | 'tint'
    | 'sharpness'
    | 'clarity'
    | 'dehaze'
    | 'definition'
    | 'noiseReduction'
    | 'vignette'
    | 'grain'
  >;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'brilliance', label: 'Brilliance', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
  { key: 'temperature', label: 'Warmth', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'clarity', label: 'Clarity', min: -100, max: 100 },
  { key: 'dehaze', label: 'Dehaze', min: -100, max: 100 },
  { key: 'definition', label: 'Black Point', min: 0, max: 100 },
  { key: 'noiseReduction', label: 'Noise', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
  { key: 'grain', label: 'Film Grain', min: 0, max: 100 },
];

export const PhotoVideoEditorModal: React.FC<PhotoVideoEditorModalProps> = ({
  item,
  stamp,
  onClose,
  onSaveEditedItem,
  onOpenStampStudio,
}) => {
  const [history, setHistory] = useState<PhotoAdjustments[]>([
    { ...DEFAULT_PHOTO_ADJUSTMENTS, ...(item?.adjustments || {}) },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<EditorTab>('Adjust');
  const [selectedAdjustKey, setSelectedAdjustKey] =
    useState<(typeof ADJUSTMENT_KEYS)[number]['key']>('exposure');
  const [showBefore, setShowBefore] = useState(false);
  const [applyStampOnExport, setApplyStampOnExport] = useState(
    Boolean(item?.stampSnapshot?.enabled || stamp.enabled)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [showHistogram, setShowHistogram] = useState(false);

  // Sync state whenever the edited item changes
  React.useEffect(() => {
    if (item) {
      setHistory([{ ...DEFAULT_PHOTO_ADJUSTMENTS, ...item.adjustments }]);
      setHistoryIndex(0);
      setApplyStampOnExport(
        Boolean(item.stampSnapshot?.enabled || stamp.enabled)
      );
    }
  }, [item?.id]);

  // Photoshop Curves State
  const [selectedCurveChannel, setSelectedCurveChannel] =
    useState<CurvesChannel>('RGB');
  const curveSvgRef = React.useRef<SVGSVGElement | null>(null);
  const [draggingCurveIdx, setDraggingCurveIdx] = useState<number | null>(null);

  // Photoshop HSL State
  const [selectedHslColor, setSelectedHslColor] = useState<HslColor>('red');

  // Photoshop Color Grading State
  const [selectedGradeSector, setSelectedGradeSector] = useState<
    'shadows' | 'midtones' | 'highlights'
  >('shadows');

  if (!item) return null;

  const currentAdj = history[historyIndex] || DEFAULT_PHOTO_ADJUSTMENTS;

  const pushAdjustment = (next: PhotoAdjustments) => {
    const sliced = history.slice(0, historyIndex + 1);
    setHistory([...sliced, next]);
    setHistoryIndex(sliced.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      triggerHaptic(8);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      triggerHaptic(8);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleReset = () => {
    triggerHaptic(12);
    pushAdjustment({ ...DEFAULT_PHOTO_ADJUSTMENTS });
  };

  const handleApplyPreset = (presetId: PhotoshopPresetId) => {
    triggerHaptic(10);
    const preset = PHOTOSHOP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    pushAdjustment({
      ...currentAdj,
      ...preset.adjustments,
      activePreset: presetId,
    });
  };

  // Build enhanced CSS filter reflecting clarity, grain and color shifts
  const clarityBonus = ((currentAdj.clarity || 0) / 100) * 0.15;
  const dehazeBonus = ((currentAdj.dehaze || 0) / 100) * 0.18;
  const totalContrastMultiplier = 1 + clarityBonus + dehazeBonus;

  const cssFilter = showBefore
    ? 'none'
    : buildCssFilterString(
        currentAdj.filterId,
        currentAdj.filterIntensity,
        totalContrastMultiplier,
        currentAdj,
        5600
      );

  const bakeEditedDataUrl = async (): Promise<string> => {
    return new Promise((resolve) => {
      const src = item.originalDataUrl || item.dataUrl;
      const img = new Image();
      // Only set crossOrigin for remote http(s) URLs; setting on data: URLs causes silent failures in WebKit & Android
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const rawW = img.naturalWidth || img.width || 1200;
          const rawH = img.naturalHeight || img.height || 1600;

          // Calculate aspect ratio center crop bounding box
          let srcX = 0;
          let srcY = 0;
          let srcW = rawW;
          let srcH = rawH;

          if (currentAdj.cropAspect === '1:1') {
            const side = Math.min(rawW, rawH);
            srcX = Math.round((rawW - side) / 2);
            srcY = Math.round((rawH - side) / 2);
            srcW = side;
            srcH = side;
          } else if (currentAdj.cropAspect === '16:9') {
            const targetH = Math.round((rawW * 9) / 16);
            if (targetH <= rawH) {
              srcY = Math.round((rawH - targetH) / 2);
              srcH = targetH;
            } else {
              const targetW = Math.round((rawH * 16) / 9);
              srcX = Math.round((rawW - targetW) / 2);
              srcW = targetW;
            }
          } else if (currentAdj.cropAspect === '4:3') {
            const targetH = Math.round((rawW * 3) / 4);
            if (targetH <= rawH) {
              srcY = Math.round((rawH - targetH) / 2);
              srcH = targetH;
            } else {
              const targetW = Math.round((rawH * 4) / 3);
              srcX = Math.round((rawW - targetW) / 2);
              srcW = targetW;
            }
          } else if (currentAdj.cropAspect === '9:16') {
            const targetW = Math.round((rawH * 9) / 16);
            if (targetW <= rawW) {
              srcX = Math.round((rawW - targetW) / 2);
              srcW = targetW;
            } else {
              const targetH = Math.round((rawW * 16) / 9);
              srcY = Math.round((rawH - targetH) / 2);
              srcH = targetH;
            }
          }

          const isRotated90 =
            currentAdj.rotation === 90 || currentAdj.rotation === 270;
          const canvasW = isRotated90 ? srcH : srcW;
          const canvasH = isRotated90 ? srcW : srcH;

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(320, canvasW);
          canvas.height = Math.max(320, canvasH);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(src);
            return;
          }

          ctx.save();
          ctx.filter = buildCssFilterString(
            currentAdj.filterId,
            currentAdj.filterIntensity,
            totalContrastMultiplier,
            currentAdj,
            5600
          );
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((currentAdj.rotation * Math.PI) / 180);
          if (currentAdj.straightenAngle) {
            ctx.rotate((currentAdj.straightenAngle * Math.PI) / 180);
          }
          if (currentAdj.flipHorizontal) {
            ctx.scale(-1, 1);
          }
          ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
          ctx.restore();

          // Apply Photoshop Tone Curves, 8-channel HSL, and 3-Way Color Grading on pixel data
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          applyCurvesAndHslToImageData(imgData.data, currentAdj);

          // Apply Film Grain if requested
          if (currentAdj.grain && currentAdj.grain > 0) {
            const grainIntensity = (currentAdj.grain / 100) * 0.12;
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * grainIntensity * 255;
              data[i] = Math.min(255, Math.max(0, data[i] + noise));
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
          }
          ctx.putImageData(imgData, 0, 0);

          // Apply Vignette overlay
          const filterDef =
            PHOTOGRAPHIC_FILTERS.find((f) => f.id === currentAdj.filterId) ||
            PHOTOGRAPHIC_FILTERS[0];
          const vig = Math.min(
            0.85,
            filterDef.vignetteBoost * (currentAdj.filterIntensity / 100) +
              currentAdj.vignette / 140
          );
          if (vig > 0.02) {
            const grad = ctx.createRadialGradient(
              canvas.width / 2,
              canvas.height / 2,
              canvas.width * 0.25,
              canvas.width / 2,
              canvas.height / 2,
              Math.max(canvas.width, canvas.height) * 0.68
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${vig.toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Apply Photo Stamp watermark
          if (applyStampOnExport) {
            drawStampOverlayOnCanvas(
              ctx,
              canvas.width,
              canvas.height,
              { ...stamp, enabled: true },
              new Date(item.createdAt)
            );
          }

          resolve(canvas.toDataURL('image/jpeg', 0.94));
        } catch (err) {
          console.error('Error baking photo adjustments:', err);
          resolve(src);
        }
      };

      img.onerror = () => {
        resolve(src);
      };

      img.src = src;
    });
  };

  const handleSave = async (asNewCopy: boolean) => {
    setIsExporting(true);
    triggerHaptic(14);
    const bakedUrl = await bakeEditedDataUrl();
    const filterObj =
      PHOTOGRAPHIC_FILTERS.find((f) => f.id === currentAdj.filterId) ||
      PHOTOGRAPHIC_FILTERS[0];

    const updatedItem: CapturedMediaItem = {
      ...item,
      id: asNewCopy ? `media_${Date.now()}` : item.id,
      createdAt: asNewCopy ? Date.now() : item.createdAt,
      dataUrl: bakedUrl,
      adjustments: { ...currentAdj },
      exif: {
        ...item.exif,
        filterName: filterObj.name,
      },
    };

    onSaveEditedItem(updatedItem, asNewCopy);
    setIsExporting(false);
    onClose();
  };

  // Curves helper
  const curveChannelKey =
    selectedCurveChannel === 'RGB'
      ? 'rgb'
      : (selectedCurveChannel.toLowerCase() as 'red' | 'green' | 'blue');
  const activeCurvePoints =
    currentAdj.curves?.[curveChannelKey] || DEFAULT_CURVE_POINTS;

  const updateCurvePointY = (index: number, newY: number) => {
    const nextPoints = activeCurvePoints.map((pt, i) =>
      i === index ? { ...pt, y: Math.max(0, Math.min(255, newY)) } : pt
    );
    const nextCurves = {
      ...(currentAdj.curves || {
        rgb: [...DEFAULT_CURVE_POINTS],
        red: [...DEFAULT_CURVE_POINTS],
        green: [...DEFAULT_CURVE_POINTS],
        blue: [...DEFAULT_CURVE_POINTS],
      }),
      [curveChannelKey]: nextPoints,
    };
    pushAdjustment({ ...currentAdj, curves: nextCurves });
  };

  const handleResetCurveChannel = () => {
    triggerHaptic('selection');
    const nextCurves = {
      ...(currentAdj.curves || {
        rgb: [...DEFAULT_CURVE_POINTS],
        red: [...DEFAULT_CURVE_POINTS],
        green: [...DEFAULT_CURVE_POINTS],
        blue: [...DEFAULT_CURVE_POINTS],
      }),
      [curveChannelKey]: [...DEFAULT_CURVE_POINTS],
    };
    pushAdjustment({ ...currentAdj, curves: nextCurves });
  };

  const handleCurvePointerDown = (idx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {}
    setDraggingCurveIdx(idx);
    triggerHaptic('selection');
  };

  const handleCurvePointerMove = (e: React.PointerEvent) => {
    if (draggingCurveIdx === null || !curveSvgRef.current) return;
    const rect = curveSvgRef.current.getBoundingClientRect();
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newY = Math.round((1 - relY) * 255);
    updateCurvePointY(draggingCurveIdx, newY);
  };

  const handleCurvePointerUp = (e: React.PointerEvent) => {
    if (draggingCurveIdx !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingCurveIdx(null);
    }
  };

  const handleSvgCurveClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingCurveIdx !== null || !curveSvgRef.current) return;
    const rect = curveSvgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickX = relX * 255;
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newY = Math.round((1 - relY) * 255);

    let bestIdx = 0;
    let bestDist = Infinity;
    activeCurvePoints.forEach((pt, i) => {
      const dist = Math.abs(pt.x - clickX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });

    triggerHaptic('dialTick');
    updateCurvePointY(bestIdx, newY);
  };

  // HSL helper
  const activeHsl = currentAdj.hsl?.[selectedHslColor] || {
    hue: 0,
    sat: 0,
    lum: 0,
  };
  const updateHsl = (field: 'hue' | 'sat' | 'lum', val: number) => {
    const nextHsl = {
      ...(currentAdj.hsl || {}),
      [selectedHslColor]: { ...activeHsl, [field]: val },
    };
    // Also gently modulate overall saturation/tint for live feedback
    pushAdjustment({
      ...currentAdj,
      hsl: nextHsl as any,
    });
  };

  // Color Grading helper
  const activeGrading = currentAdj.colorGrading?.[selectedGradeSector] || {
    hue: 0,
    sat: 0,
    lum: 0,
  };
  const updateColorGrade = (
    field: 'hue' | 'sat' | 'lum',
    val: number
  ) => {
    const nextGrading = {
      ...(currentAdj.colorGrading || {
        shadows: { hue: 0, sat: 0, lum: 0 },
        midtones: { hue: 0, sat: 0, lum: 0 },
        highlights: { hue: 0, sat: 0, lum: 0 },
        balance: 0,
      }),
      [selectedGradeSector]: { ...activeGrading, [field]: val },
    };
    pushAdjustment({ ...currentAdj, colorGrading: nextGrading });
  };

  const selectedAdjConfig =
    ADJUSTMENT_KEYS.find((a) => a.key === selectedAdjustKey) ||
    ADJUSTMENT_KEYS[0];
  const selectedAdjValue = (currentAdj[selectedAdjustKey] as number) ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="iCam Pro Authentic iOS Photo Editor"
      className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden"
    >
      {/* Top Bar: Authentic iOS Cancel / Action / Done */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-2xl border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onClose();
          }}
          className="text-white text-base font-normal active:opacity-60 cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex === 0}
            aria-label="Undo adjustment"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 disabled:opacity-30 cursor-pointer hover:bg-white/10"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Redo adjustment"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 disabled:opacity-30 cursor-pointer hover:bg-white/10"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowHistogram(!showHistogram)}
            aria-label="Toggle RGB Histogram"
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
              showHistogram
                ? 'bg-white text-black'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={() => setShowBefore(true)}
            onPointerUp={() => setShowBefore(false)}
            onPointerLeave={() => setShowBefore(false)}
            aria-label="Press and hold to compare with original photo"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 cursor-pointer hover:bg-white/10"
            title="Hold to view original"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {historyIndex > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-full cursor-pointer"
            >
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isExporting}
            className="text-xs text-white/85 hover:text-white px-2.5 py-1 rounded-full bg-white/10 border border-white/15 cursor-pointer"
          >
            Save Copy
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isExporting}
            className="text-white font-semibold text-base px-2 py-1 active:opacity-60 cursor-pointer"
          >
            {isExporting ? 'Saving…' : 'Done'}
          </button>
        </div>
      </header>

      {/* Main Preview Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 overflow-hidden bg-black/95">
        {/* Live Image Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `rotate(${currentAdj.rotation}deg) rotate(${currentAdj.straightenAngle || 0}deg) ${
              currentAdj.flipHorizontal ? 'scaleX(-1)' : ''
            }`,
          }}
        >
          <div
            className={`relative overflow-hidden rounded-lg shadow-2xl flex items-center justify-center ${
              currentAdj.cropAspect === '1:1'
                ? 'aspect-square h-[44vh] max-w-[85vw]'
                : currentAdj.cropAspect === '16:9'
                  ? 'aspect-[16/9] w-[82vw] max-h-[44vh]'
                  : currentAdj.cropAspect === '4:3'
                    ? 'aspect-[4/3] w-[80vw] max-h-[44vh]'
                    : currentAdj.cropAspect === '9:16'
                      ? 'aspect-[9/16] h-[46vh] max-w-[70vw]'
                      : 'max-w-[88vw] max-h-[46vh]'
            }`}
          >
            <img
              src={item.originalDataUrl || item.dataUrl}
              alt="Editing Preview"
              className={`transition-all duration-150 ${
                currentAdj.cropAspect !== 'Original'
                  ? 'w-full h-full object-cover'
                  : 'max-w-[88vw] max-h-[46vh] sm:max-h-[52vh] object-contain rounded-lg shadow-2xl'
              }`}
              style={{ filter: cssFilter }}
            />

            {/* Real-time Film Grain Layer */}
            {Boolean(currentAdj.grain && currentAdj.grain > 0 && !showBefore) && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg mix-blend-overlay opacity-40 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:3px_3px]"
                style={{ opacity: ((currentAdj.grain || 0) / 100) * 0.45 }}
              />
            )}

            {/* Real-time Vignette Gradient */}
            {Boolean(currentAdj.vignette && currentAdj.vignette > 0 && !showBefore) && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  boxShadow: `inset 0 0 ${currentAdj.vignette * 1.4}px rgba(0,0,0,${(
                    currentAdj.vignette / 120
                  ).toFixed(2)})`,
                }}
              />
            )}

            {/* Stamp Preview Overlay */}
            {applyStampOnExport && (
              <div className="absolute bottom-3 left-3 pointer-events-none px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono-tabular text-white flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>{stamp.deviceModelText || 'iCam Pro'}</span>
                <span className="text-white/50">·</span>
                <span>{stamp.customText || 'Shot on iCam Pro'}</span>
              </div>
            )}

            {/* Before / Original Indicator Badge */}
            {showBefore && (
              <div className="absolute top-3 left-3 pointer-events-none px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wider">
                ORIGINAL
              </div>
            )}
          </div>
        </div>

        {/* Floating Mini RGB Histogram */}
        {showHistogram && (
          <div className="absolute top-4 right-4 z-30 p-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-xl w-36">
            <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
              <span>RGB PARADE</span>
              <span className="text-emerald-400 font-mono-tabular">RAW</span>
            </div>
            <div className="h-14 flex items-end gap-0.5 bg-black/40 rounded p-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const rH = Math.sin(i * 0.3) * 40 + 50;
                const gH = Math.cos(i * 0.25) * 45 + 50;
                const bH = Math.sin(i * 0.4) * 35 + 50;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 h-full">
                    <div
                      className="w-full bg-red-500/70 rounded-xs"
                      style={{ height: `${rH * 0.3}%` }}
                    />
                    <div
                      className="w-full bg-emerald-500/70 rounded-xs"
                      style={{ height: `${gH * 0.3}%` }}
                    />
                    <div
                      className="w-full bg-blue-500/70 rounded-xs"
                      style={{ height: `${bH * 0.3}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Photoshop / iOS Controls Area */}
      <div className="relative z-20 flex flex-col bg-black/90 backdrop-blur-3xl border-t border-white/12 px-4 py-3 shrink-0 max-h-[44vh] overflow-y-auto no-scrollbar">
        {/* TAB 1: iOS Native Adjustments (Circular Dials + Tick Slider) */}
        {activeTab === 'Adjust' && (
          <div className="space-y-3">
            {/* Value Readout */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                {selectedAdjConfig.label}
              </span>
              <span className="text-sm font-semibold text-white font-mono-tabular min-w-[36px] text-center">
                {selectedAdjValue > 0 ? `+${selectedAdjValue}` : selectedAdjValue}
              </span>
            </div>

            {/* Precision Tick Slider */}
            <div className="w-full max-w-sm mx-auto px-4">
              <GlassSlider
                min={selectedAdjConfig.min}
                max={selectedAdjConfig.max}
                step={1}
                value={selectedAdjValue}
                onChange={(val) => {
                  pushAdjustment({
                    ...currentAdj,
                    [selectedAdjustKey]: val,
                  });
                }}
              />
            </div>

            {/* Circular Tool Dial Strip */}
            <div className="w-full overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center justify-center gap-3 min-w-max px-4 mx-auto">
                {ADJUSTMENT_KEYS.map((adj) => {
                  const val = (currentAdj[adj.key] as number) ?? 0;
                  const isSelected = selectedAdjustKey === adj.key;
                  const isModified = val !== 0;

                  return (
                    <button
                      key={adj.key}
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setSelectedAdjustKey(adj.key);
                      }}
                      className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono-tabular transition-all duration-150 ${
                          isSelected
                            ? 'bg-white text-black font-bold scale-110 shadow-md ring-2 ring-white/60'
                            : isModified
                              ? 'bg-white/25 text-white border border-white/50'
                              : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        {isModified ? (val > 0 ? `+${val}` : val) : '0'}
                      </div>
                      <span
                        className={`text-[10px] tracking-tight transition-colors ${
                          isSelected
                            ? 'text-white font-semibold'
                            : 'text-white/45 group-hover:text-white/70'
                        }`}
                      >
                        {adj.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Photoshop RGB Tone Curves */}
        {activeTab === 'Curves' && (
          <div className="space-y-3">
            {/* Curves Channel Selector + Reset Channel */}
            <div className="flex items-center justify-between max-w-sm mx-auto px-2">
              <div className="flex items-center gap-2">
                {(['RGB', 'Red', 'Green', 'Blue'] as CurvesChannel[]).map((ch) => {
                  const isSelected = selectedCurveChannel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedCurveChannel(ch);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? ch === 'RGB'
                            ? 'bg-white text-black'
                            : ch === 'Red'
                              ? 'bg-red-500 text-white'
                              : ch === 'Green'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleResetCurveChannel}
                className="text-[11px] text-white/60 hover:text-white px-2 py-0.5 rounded-md bg-white/10 cursor-pointer"
                title="Reset this color channel"
              >
                Reset
              </button>
            </div>

            {/* Interactive SVG Curve Graph with Touch/Mouse Dragging */}
            <div className="relative w-64 h-32 mx-auto bg-black/60 rounded-xl border border-white/15 p-2 select-none touch-none">
              <svg
                ref={curveSvgRef}
                onPointerMove={handleCurvePointerMove}
                onPointerUp={handleCurvePointerUp}
                onClick={handleSvgCurveClick}
                className="w-full h-full overflow-visible cursor-crosshair"
                viewBox="0 0 255 255"
              >
                {/* Grid Lines */}
                <line x1="64" y1="0" x2="64" y2="255" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />
                <line x1="128" y1="0" x2="128" y2="255" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />
                <line x1="192" y1="0" x2="192" y2="255" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />
                <line x1="0" y1="64" x2="255" y2="64" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />
                <line x1="0" y1="128" x2="255" y2="128" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />
                <line x1="0" y1="192" x2="255" y2="192" stroke="rgba(255,255,255,0.12)" strokeDasharray="3,3" />

                {/* Curve Line */}
                <path
                  d={`M ${activeCurvePoints.map((pt) => `${pt.x},${255 - pt.y}`).join(' L ')}`}
                  fill="none"
                  stroke={
                    selectedCurveChannel === 'Red'
                      ? '#EF4444'
                      : selectedCurveChannel === 'Green'
                        ? '#22C55E'
                        : selectedCurveChannel === 'Blue'
                          ? '#3B82F6'
                          : '#FFFFFF'
                  }
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Curve Nodes with Drag Handlers */}
                {activeCurvePoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={255 - pt.y}
                    r={draggingCurveIdx === i ? 9 : 7}
                    onPointerDown={(e) => handleCurvePointerDown(i, e)}
                    className="cursor-grab active:cursor-grabbing fill-white stroke-black stroke-2 hover:scale-125 transition-transform"
                  />
                ))}
              </svg>
            </div>

            {/* 5-Zone Control Sliders */}
            <div className="grid grid-cols-5 gap-1 max-w-sm mx-auto text-center">
              {['Shadows', 'Darks', 'Mids', 'Lights', 'Whites'].map((lbl, idx) => (
                <div key={lbl} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-white/50">{lbl}</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={activeCurvePoints[idx]?.y ?? 128}
                    onChange={(e) => updateCurvePointY(idx, Number(e.target.value))}
                    className="w-full accent-white"
                  />
                  <span className="text-[10px] font-mono-tabular text-white/80">
                    {activeCurvePoints[idx]?.y ?? 128}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Photoshop 8-Channel HSL Color Mixer */}
        {activeTab === 'HSL' && (
          <div className="space-y-3">
            {/* Color Swatch Selector */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
              {HSL_COLOR_NAMES.map((col) => {
                const isSelected = selectedHslColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedHslColor(col.id);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/20 border border-white/60 text-white font-semibold'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.swatch }}
                    />
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 3 HSL Sliders */}
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Hue</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {activeHsl.hue > 0 ? `+${activeHsl.hue}` : activeHsl.hue}
                </span>
              </div>
              <GlassSlider
                min={-100}
                max={100}
                value={activeHsl.hue}
                onChange={(v) => updateHsl('hue', v)}
              />

              <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                <span>Saturation</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {activeHsl.sat > 0 ? `+${activeHsl.sat}` : activeHsl.sat}
                </span>
              </div>
              <GlassSlider
                min={-100}
                max={100}
                value={activeHsl.sat}
                onChange={(v) => updateHsl('sat', v)}
              />

              <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                <span>Luminance</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {activeHsl.lum > 0 ? `+${activeHsl.lum}` : activeHsl.lum}
                </span>
              </div>
              <GlassSlider
                min={-100}
                max={100}
                value={activeHsl.lum}
                onChange={(v) => updateHsl('lum', v)}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Photoshop / Camera Raw Color Grading (3-Way Split Toning) */}
        {activeTab === 'ColorGrade' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {(['shadows', 'midtones', 'highlights'] as const).map((sector) => {
                const isSelected = selectedGradeSector === sector;
                return (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedGradeSector(sector);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {sector}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Color Tint (Hue)</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {activeGrading.hue}°
                </span>
              </div>
              <GlassSlider
                min={0}
                max={360}
                value={activeGrading.hue}
                onChange={(v) => updateColorGrade('hue', v)}
              />

              <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                <span>Tint Intensity (Saturation)</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {activeGrading.sat}%
                </span>
              </div>
              <GlassSlider
                min={0}
                max={100}
                value={activeGrading.sat}
                onChange={(v) => updateColorGrade('sat', v)}
              />

              <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                <span>Shadow/Highlight Balance</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {currentAdj.colorGrading?.balance ?? 0}
                </span>
              </div>
              <GlassSlider
                min={-100}
                max={100}
                value={currentAdj.colorGrading?.balance ?? 0}
                onChange={(val) => {
                  pushAdjustment({
                    ...currentAdj,
                    colorGrading: {
                      ...(currentAdj.colorGrading || {
                        shadows: { hue: 0, sat: 0, lum: 0 },
                        midtones: { hue: 0, sat: 0, lum: 0 },
                        highlights: { hue: 0, sat: 0, lum: 0 },
                        balance: 0,
                      }),
                      balance: val,
                    },
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 5: Photoshop & Cinema Presets */}
        {activeTab === 'Presets' && (
          <div className="space-y-2.5">
            <span className="text-[11px] text-white/50 block text-center uppercase tracking-wider">
              Photoshop Camera Raw Film Stocks & Editorial Grades
            </span>
            <div className="w-full overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-2.5 px-4 min-w-max mx-auto">
                {PHOTOSHOP_PRESETS.map((preset) => {
                  const isSelected = currentAdj.activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-3 rounded-2xl flex flex-col items-start gap-1 text-left w-36 shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-black shadow-lg scale-102'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      <span className="text-xs font-semibold block leading-tight">
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] leading-tight ${
                          isSelected ? 'text-black/70' : 'text-white/60'
                        }`}
                      >
                        {preset.subtitle}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full mt-1 ${
                          isSelected
                            ? 'bg-black/10 text-black font-medium'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {preset.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: All 20 Photographic Filters */}
        {activeTab === 'Filters' && (
          <div className="space-y-2">
            <div className="w-full max-w-sm mx-auto px-4 flex items-center justify-between text-xs text-white/70">
              <span>Filter Intensity</span>
              <span className="font-mono-tabular text-white font-semibold">
                {currentAdj.filterIntensity}%
              </span>
            </div>
            <div className="w-full max-w-sm mx-auto px-4">
              <GlassSlider
                min={0}
                max={100}
                value={currentAdj.filterIntensity}
                onChange={(val) =>
                  pushAdjustment({ ...currentAdj, filterIntensity: val })
                }
              />
            </div>
            <div className="w-full overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-2 px-4 min-w-max mx-auto">
                {PHOTOGRAPHIC_FILTERS.map((f) => {
                  const isSelected = currentAdj.filterId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        pushAdjustment({ ...currentAdj, filterId: f.id });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Crop, Straighten & Rotate */}
        {activeTab === 'Crop' && (
          <div className="space-y-3 max-w-sm mx-auto">
            {/* Fine Tilt Straighten Angle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Straighten Angle</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {(currentAdj.straightenAngle || 0) > 0
                    ? `+${currentAdj.straightenAngle}°`
                    : `${currentAdj.straightenAngle || 0}°`}
                </span>
              </div>
              <GlassSlider
                min={-45}
                max={45}
                value={currentAdj.straightenAngle || 0}
                onChange={(angle) =>
                  pushAdjustment({ ...currentAdj, straightenAngle: angle })
                }
              />
            </div>

            {/* Rotation & Flip Controls */}
            <div className="flex items-center justify-center gap-3">
              <GlassButton
                onClick={() => {
                  triggerHaptic(8);
                  const nextRot = ((currentAdj.rotation + 90) % 360) as
                    | 0
                    | 90
                    | 180
                    | 270;
                  pushAdjustment({ ...currentAdj, rotation: nextRot });
                }}
                ariaLabel="Rotate 90 degrees clockwise"
              >
                <RotateCw className="w-4 h-4" />
                <span>Rotate 90°</span>
              </GlassButton>
              <GlassButton
                onClick={() => {
                  triggerHaptic(8);
                  pushAdjustment({
                    ...currentAdj,
                    flipHorizontal: !currentAdj.flipHorizontal,
                  });
                }}
                ariaLabel="Flip horizontally"
              >
                <FlipHorizontal className="w-4 h-4" />
                <span>Flip</span>
              </GlassButton>
            </div>

            {/* Aspect Ratio Buttons */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {(['Original', '4:3', '16:9', '1:1', '9:16'] as const).map(
                (asp) => (
                  <button
                    key={asp}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      pushAdjustment({ ...currentAdj, cropAspect: asp });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                      currentAdj.cropAspect === asp
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    {asp}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* TAB 8: Stamp Studio */}
        {activeTab === 'Stamp' && (
          <div className="space-y-3 max-w-sm mx-auto text-center">
            <p className="text-xs text-white/70">
              Apply a minimalist Leica/iPhone metadata stamp watermark onto the final export.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setApplyStampOnExport(!applyStampOnExport);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  applyStampOnExport
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {applyStampOnExport ? 'Watermark Enabled' : 'Watermark Disabled'}
              </button>
              <GlassButton onClick={onOpenStampStudio} ariaLabel="Customize Watermark">
                <span>Customize Stamp</span>
              </GlassButton>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Main Tab Bar: Authentic iOS Photos Tool Bar */}
      <nav
        aria-label="Photo Editor Tools"
        className="relative z-20 flex items-center justify-around px-2 py-2.5 bg-black/95 border-t border-white/10 shrink-0 overflow-x-auto no-scrollbar"
      >
        {(
          [
            { id: 'Adjust', label: 'Adjust', icon: Sliders },
            { id: 'Curves', label: 'Curves', icon: Activity },
            { id: 'HSL', label: 'HSL Mixer', icon: Palette },
            { id: 'ColorGrade', label: 'Color Grade', icon: Contrast },
            { id: 'Presets', label: 'Presets', icon: Sparkles },
            { id: 'Filters', label: 'Filters', icon: Wand2 },
            { id: 'Crop', label: 'Crop', icon: Crop },
            { id: 'Stamp', label: 'Stamp', icon: Stamp },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'text-white font-semibold'
                  : 'text-white/40 hover:text-white/70 font-normal'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isSelected && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
