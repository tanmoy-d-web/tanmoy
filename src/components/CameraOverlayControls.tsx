import React, { useState } from 'react';
import {
  Zap,
  Timer,
  Grid,
  Compass,
  Sparkles,
  Sun,
  Maximize2,
  Film,
  ShieldCheck,
  Stamp,
  RotateCcw,
  Aperture,
  Moon,
  Layers,
  X,
  Search,
} from 'lucide-react';
import {
  PHOTOGRAPHIC_FILTERS,
  PHOTOGRAPHIC_STYLES,
  SUPPORTED_ISO_VALUES,
  SUPPORTED_SHUTTER_SPEEDS,
  type AspectRatioOption,
  type CameraMode,
  type FilterCategory,
  type FilterId,
  type FlashMode,
  type PhotographicStyleId,
  type ProControlsState,
  type TimerSeconds,
  type VideoFps,
  type VideoResolution,
  type WhiteBalancePreset,
} from '../engine/cameraEngine';
import { OPTICAL_SCENES, type OpticalSceneId } from '../engine/sceneSynthesizer';
import { GlassSlider, triggerHaptic, getZoomHapticType } from './GlassUI';

export const CAMERA_MODES: CameraMode[] = [
  'Time-lapse',
  'Slo-mo',
  'Cinematic',
  'Video',
  'Photo',
  'Portrait',
  'Night',
  'Panorama',
  'Pro',
];

export interface ZoomSelectorProps {
  zoom: number;
  onSelectZoom: (z: number) => void;
  isFrontCamera: boolean;
}

export const ZoomSelector: React.FC<ZoomSelectorProps> = ({
  zoom,
  onSelectZoom,
  isFrontCamera,
}) => {
  const presets = isFrontCamera
    ? [
        { label: '.8', val: 0.8, mm: '18mm' },
        { label: '1x', val: 1.0, mm: '23mm' },
      ]
    : [
        { label: '.5', val: 0.5, mm: '13mm' },
        { label: '1x', val: 1.0, mm: '24mm' },
        { label: '2x', val: 2.0, mm: '48mm' },
        { label: '3x', val: 3.0, mm: '77mm' },
      ];

  return (
    <div
      className="zoom-selector"
      role="group"
      aria-label="Optical Zoom Selector"
    >
      {presets.map((p) => {
        const isSelected = Math.abs(zoom - p.val) < 0.15;
        return (
          <button
            key={p.val}
            type="button"
            onClick={() => {
              triggerHaptic(getZoomHapticType(p.val));
              onSelectZoom(p.val);
            }}
            aria-label={`Zoom ${p.label} (${p.mm})`}
            aria-pressed={isSelected}
            className={`zoom-option ${isSelected ? 'active' : ''}`}
          >
            {isSelected ? `${zoom.toFixed(zoom % 1 === 0 ? 0 : 1)}x` : p.label}
          </button>
        );
      })}
    </div>
  );
};

export interface CameraModeSelectorProps {
  activeMode: CameraMode;
  onSelectMode: (mode: CameraMode) => void;
}

export const CameraModeSelector: React.FC<CameraModeSelectorProps> = ({
  activeMode,
  onSelectMode,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const activeTabRef = React.useRef<HTMLButtonElement | null>(null);

  const centerActiveMode = React.useCallback((smooth = true) => {
    const container = containerRef.current;
    const activeBtn = activeTabRef.current;
    if (!container || !activeBtn) return;
    const targetLeft =
      activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  React.useEffect(() => {
    centerActiveMode(true);
  }, [activeMode, centerActiveMode]);

  React.useEffect(() => {
    const onResize = () => centerActiveMode(false);
    window.addEventListener('resize', onResize);
    const id = window.setTimeout(() => centerActiveMode(false), 50);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(id);
    };
  }, [centerActiveMode]);

  return (
    <div
      ref={containerRef}
      className="camera-mode-bar no-scrollbar"
      role="tablist"
      aria-label="Camera Modes"
    >
      <div className="flex items-center gap-5 px-[44%] min-w-max">
        {CAMERA_MODES.map((mode) => {
          const isSelected = activeMode === mode;
          const label = mode === 'Panorama' ? 'PANO' : mode.toUpperCase();
          return (
            <button
              key={mode}
              ref={isSelected ? activeTabRef : null}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`${mode} Mode`}
              onClick={() => {
                triggerHaptic('modeSwitch');
                onSelectMode(mode);
              }}
              className={`camera-mode ${isSelected ? 'active' : ''}`}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface ExpandableControlCenterProps {
  open: boolean;
  onClose: () => void;
  flash: FlashMode;
  onChangeFlash: (f: FlashMode) => void;
  hdrEnabled: boolean;
  onToggleHdr: () => void;
  livePhoto: boolean;
  onToggleLivePhoto: () => void;
  timer: TimerSeconds;
  onChangeTimer: (t: TimerSeconds) => void;
  aspectRatio: AspectRatioOption;
  onChangeAspectRatio: (a: AspectRatioOption) => void;
  ev: number;
  onChangeEv: (ev: number) => void;
  rawEnabled: boolean;
  onToggleRaw: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  levelEnabled: boolean;
  onToggleLevel: () => void;
  stabilization: boolean;
  onToggleStabilization: () => void;
  videoResolution: VideoResolution;
  onChangeVideoResolution: (r: VideoResolution) => void;
  videoFps: VideoFps;
  onChangeVideoFps: (fps: VideoFps) => void;
  stampEnabled: boolean;
  onOpenStampStudio: () => void;
  activeSceneId?: OpticalSceneId;
  onSelectScene?: (id: OpticalSceneId) => void;
  useHardwareWebcam?: boolean;
  onToggleWebcam?: () => void;
}

export const ExpandableControlCenter: React.FC<ExpandableControlCenterProps> = ({
  open,
  onClose,
  flash,
  onChangeFlash,
  hdrEnabled,
  onToggleHdr,
  livePhoto,
  onToggleLivePhoto,
  timer,
  onChangeTimer,
  aspectRatio,
  onChangeAspectRatio,
  ev,
  onChangeEv,
  rawEnabled,
  onToggleRaw,
  gridEnabled,
  onToggleGrid,
  levelEnabled,
  onToggleLevel,
  stabilization,
  onToggleStabilization,
  videoResolution,
  onChangeVideoResolution,
  videoFps,
  onChangeVideoFps,
  stampEnabled,
  onOpenStampStudio,
  activeSceneId = 'alpine_sunset',
  onSelectScene,
  useHardwareWebcam = false,
  onToggleWebcam,
}) => {
  const [expandedRow, setExpandedRow] = useState<
    'none' | 'flash' | 'timer' | 'aspect' | 'ev' | 'video' | 'scene'
  >('none');

  if (!open) return null;

  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl liquid-glass-heavy p-3.5 space-y-3 animate-fadeIn"
      role="region"
      aria-label="Camera Control Center"
    >
      {/* Top Row: Authentic iOS Compact Circular Icon Strip */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {/* Flash */}
        <button
          type="button"
          onClick={() =>
            setExpandedRow(expandedRow === 'flash' ? 'none' : 'flash')
          }
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            expandedRow === 'flash' || flash !== 'Off'
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-medium">{flash}</span>
        </button>

        {/* Live Photo */}
        <button
          type="button"
          onClick={onToggleLivePhoto}
          aria-label="Toggle Live Photo"
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            livePhoto ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          <Aperture className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-medium">
            {livePhoto ? 'Live' : 'Off'}
          </span>
        </button>

        {/* Aspect Ratio */}
        <button
          type="button"
          onClick={() =>
            setExpandedRow(expandedRow === 'aspect' ? 'none' : 'aspect')
          }
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            expandedRow === 'aspect'
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Maximize2 className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-mono-tabular font-medium">
            {aspectRatio}
          </span>
        </button>

        {/* Exposure ±EV */}
        <button
          type="button"
          onClick={() => setExpandedRow(expandedRow === 'ev' ? 'none' : 'ev')}
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            expandedRow === 'ev' || ev !== 0
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Sun className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-mono-tabular font-medium">
            {ev >= 0 ? `+${ev.toFixed(1)}` : ev.toFixed(1)}
          </span>
        </button>

        {/* Timer */}
        <button
          type="button"
          onClick={() =>
            setExpandedRow(expandedRow === 'timer' ? 'none' : 'timer')
          }
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            expandedRow === 'timer' || timer > 0
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Timer className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-mono-tabular font-medium">
            {timer === 0 ? 'Off' : `${timer}s`}
          </span>
        </button>

        {/* RAW */}
        <button
          type="button"
          onClick={onToggleRaw}
          aria-label="Toggle Apple ProRAW DNG"
          className={`flex flex-col items-center gap-1 min-w-[48px] py-1.5 rounded-2xl transition-colors cursor-pointer ${
            rawEnabled
              ? 'bg-white/20 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-medium">
            {rawEnabled ? 'RAW' : 'JPEG'}
          </span>
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse Control Center"
          className="flex flex-col items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white/80 hover:text-white cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Single-Row Option Strip */}
      {expandedRow === 'flash' && (
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
          {(['Auto', 'On', 'Off'] as FlashMode[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChangeFlash(f)}
              className={`h-8 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                flash === f
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              Flash {f}
            </button>
          ))}
        </div>
      )}

      {expandedRow === 'timer' && (
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
          {([0, 3, 5, 10] as TimerSeconds[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChangeTimer(t)}
              className={`h-8 rounded-full text-xs font-mono-tabular font-medium transition-colors cursor-pointer ${
                timer === t
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {t === 0 ? 'Timer Off' : `${t}s`}
            </button>
          ))}
        </div>
      )}

      {expandedRow === 'aspect' && (
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
          {(['4:3', '16:9', '1:1', 'Full'] as AspectRatioOption[]).map((ar) => (
            <button
              key={ar}
              type="button"
              onClick={() => onChangeAspectRatio(ar)}
              className={`h-8 rounded-full text-xs font-mono-tabular font-medium transition-colors cursor-pointer ${
                aspectRatio === ar
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>
      )}

      {expandedRow === 'ev' && (
        <div className="pt-2 border-t border-white/10">
          <GlassSlider
            label="Exposure Bias (EV)"
            value={ev}
            min={-2.0}
            max={2.0}
            step={0.1}
            formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} EV`}
            onChange={onChangeEv}
            onReset={() => onChangeEv(0)}
          />
        </div>
      )}

      {/* Secondary Row: Compact Pills for HDR, Grid, Level, Video Res/FPS, Stamp & Test Scene */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleHdr}
            aria-label="Toggle Smart HDR"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
              hdrEnabled
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            HDR {hdrEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={onToggleGrid}
            aria-label="Toggle Composition Grid"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              gridEnabled
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={onToggleLevel}
            aria-label="Toggle Horizon Level"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              levelEnabled
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Level</span>
          </button>

          <button
            type="button"
            onClick={onToggleStabilization}
            aria-label="Toggle Action OIS Stabilization"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              stabilization
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>OIS</span>
          </button>

          <button
            type="button"
            onClick={onOpenStampStudio}
            aria-label="Open Photo Stamp Studio"
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              stampEnabled
                ? 'bg-white/25 text-white'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Stamp className="w-3 h-3" />
            <span>Stamp</span>
          </button>
        </div>

        {/* Video Resolution & Scene Quick Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const order: VideoResolution[] = ['720p', '1080p', '4K'];
              onChangeVideoResolution(
                order[(order.indexOf(videoResolution) + 1) % order.length]
              );
            }}
            className="px-2 py-1 rounded-full bg-white/15 text-[11px] font-mono-tabular text-white cursor-pointer"
          >
            {videoResolution}
          </button>
          <button
            type="button"
            onClick={() => {
              const order: VideoFps[] = [24, 30, 60];
              onChangeVideoFps(
                order[(order.indexOf(videoFps) + 1) % order.length]
              );
            }}
            className="px-2 py-1 rounded-full bg-white/15 text-[11px] font-mono-tabular text-white cursor-pointer"
          >
            {videoFps}fps
          </button>
          {onSelectScene && (
            <button
              type="button"
              onClick={() =>
                setExpandedRow(expandedRow === 'scene' ? 'none' : 'scene')
              }
              aria-label="Switch Optical Scene or Webcam"
              className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] text-white/90 flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>Scene</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Optical Scene / Live Webcam Selector inside Control Tray */}
      {expandedRow === 'scene' && onSelectScene && (
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/70">
            <span>Optical Sensor Source</span>
            {onToggleWebcam && (
              <button
                type="button"
                onClick={onToggleWebcam}
                className="text-white underline cursor-pointer"
              >
                {useHardwareWebcam ? 'Switch to HDR Scene' : 'Use Hardware Webcam'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {OPTICAL_SCENES.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onSelectScene(sc.id)}
                className={`p-2 rounded-xl text-left text-[11px] transition-colors cursor-pointer ${
                  !useHardwareWebcam && activeSceneId === sc.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {sc.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export interface ProCameraPanelProps {
  pro: ProControlsState;
  onChangePro: (next: ProControlsState) => void;
}

export const ProCameraPanel: React.FC<ProCameraPanelProps> = ({
  pro,
  onChangePro,
}) => {
  const [activeParam, setActiveParam] = useState<
    'ISO' | 'SHUTTER' | 'FOCUS' | 'WB' | 'EV'
  >('ISO');

  const resetAllPro = () => {
    triggerHaptic(12);
    onChangePro({
      iso: 'Auto',
      shutterSpeed: 'Auto',
      focusDistance: 'Auto',
      whiteBalance: 'Auto',
      kelvin: 5600,
      ev: 0,
      rawDng: pro.rawDng,
      histogramEnabled: pro.histogramEnabled,
    });
  };

  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl liquid-glass px-3.5 py-2.5 space-y-2.5"
      role="region"
      aria-label="Pro Manual Camera Controls"
    >
      {/* Compact Circular/Pill iPhone-Style Pro Dials */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5">
          {[
            {
              id: 'ISO' as const,
              label: 'ISO',
              val: pro.iso === 'Auto' ? 'AUTO' : `${pro.iso}`,
            },
            {
              id: 'SHUTTER' as const,
              label: 'SEC',
              val: pro.shutterSpeed === 'Auto' ? 'AUTO' : pro.shutterSpeed,
            },
            {
              id: 'FOCUS' as const,
              label: 'AF',
              val:
                pro.focusDistance === 'Auto'
                  ? 'AUTO'
                  : `${pro.focusDistance.toFixed(1)}m`,
            },
            {
              id: 'WB' as const,
              label: 'WB',
              val:
                pro.whiteBalance === 'Manual'
                  ? `${pro.kelvin}K`
                  : pro.whiteBalance,
            },
            {
              id: 'EV' as const,
              label: 'EV',
              val: `${pro.ev >= 0 ? '+' : ''}${pro.ev.toFixed(1)}`,
            },
          ].map((item) => {
            const isSelected = activeParam === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setActiveParam(item.id);
                }}
                aria-label={`Pro ${item.label} Control`}
                aria-pressed={isSelected}
                className={`min-h-[38px] px-2.5 py-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span className="text-[9px] font-medium opacity-70">
                  {item.label}
                </span>
                <span className="text-[11px] font-mono-tabular font-semibold">
                  {item.val}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onChangePro({ ...pro, rawDng: !pro.rawDng })}
            aria-label="Toggle ProRAW"
            className={`min-h-[38px] px-2.5 py-1 rounded-2xl text-[11px] font-mono-tabular font-semibold cursor-pointer ${
              pro.rawDng
                ? 'bg-white/25 text-white border border-white/40'
                : 'bg-white/10 text-white/55'
            }`}
          >
            RAW
          </button>
          <button
            type="button"
            onClick={resetAllPro}
            aria-label="Reset Pro Controls to Auto"
            className="min-h-[38px] w-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white/85 flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Fine Dial Scale */}
      {activeParam === 'ISO' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onChangePro({ ...pro, iso: 'Auto' })}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono-tabular cursor-pointer ${
              pro.iso === 'Auto'
                ? 'bg-white text-black font-semibold'
                : 'bg-white/10 text-white/75'
            }`}
          >
            AUTO
          </button>
          {SUPPORTED_ISO_VALUES.map((isoVal) => (
            <button
              key={isoVal}
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onChangePro({ ...pro, iso: isoVal });
              }}
              className={`h-7 px-2.5 rounded-full text-[11px] font-mono-tabular cursor-pointer ${
                pro.iso === isoVal
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/75 hover:bg-white/20'
              }`}
            >
              {isoVal}
            </button>
          ))}
        </div>
      )}

      {activeParam === 'SHUTTER' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onChangePro({ ...pro, shutterSpeed: 'Auto' })}
            className={`h-7 px-2.5 rounded-full text-[11px] font-mono-tabular cursor-pointer shrink-0 ${
              pro.shutterSpeed === 'Auto'
                ? 'bg-white text-black font-semibold'
                : 'bg-white/10 text-white/75'
            }`}
          >
            AUTO
          </button>
          {SUPPORTED_SHUTTER_SPEEDS.map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onChangePro({ ...pro, shutterSpeed: spd });
              }}
              className={`h-7 px-2.5 rounded-full text-[11px] font-mono-tabular cursor-pointer shrink-0 ${
                pro.shutterSpeed === spd
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/75 hover:bg-white/20'
              }`}
            >
              {spd}
            </button>
          ))}
        </div>
      )}

      {activeParam === 'FOCUS' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onChangePro({ ...pro, focusDistance: 'Auto' })}
              className={`h-7 px-2.5 rounded-full text-[11px] font-mono-tabular cursor-pointer shrink-0 ${
                pro.focusDistance === 'Auto'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/10 text-white/75'
              }`}
            >
              AF
            </button>
            <div className="flex-1">
              <GlassSlider
                label="Manual Focus Distance"
                value={pro.focusDistance === 'Auto' ? 0.5 : pro.focusDistance}
                min={0}
                max={1}
                step={0.02}
                formatValue={(v) =>
                  pro.focusDistance === 'Auto' ? 'Auto' : `${v.toFixed(2)}m`
                }
                onChange={(v) => onChangePro({ ...pro, focusDistance: v })}
              />
            </div>
          </div>

          {/* Focus Peaking Precision Visual Aid Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onChangePro({
                    ...pro,
                    focusPeakingEnabled: !(pro.focusPeakingEnabled !== false),
                  });
                }}
                aria-label="Toggle Focus Peaking Visual Aid"
                aria-pressed={pro.focusPeakingEnabled !== false}
                className={`h-6 px-2.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  pro.focusPeakingEnabled !== false
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      pro.focusPeakingColor === 'red'
                        ? '#FF3366'
                        : pro.focusPeakingColor === 'yellow'
                          ? '#FFE600'
                          : pro.focusPeakingColor === 'cyan'
                            ? '#00F0FF'
                            : '#00FF66',
                  }}
                />
                <span>Focus Peaking {pro.focusPeakingEnabled !== false ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {pro.focusPeakingEnabled !== false && (
              <div className="flex items-center gap-1">
                {[
                  { id: 'green' as const, label: 'G', color: '#00FF66' },
                  { id: 'cyan' as const, label: 'C', color: '#00F0FF' },
                  { id: 'red' as const, label: 'R', color: '#FF3366' },
                  { id: 'yellow' as const, label: 'Y', color: '#FFE600' },
                ].map((c) => {
                  const isSelected = (pro.focusPeakingColor || 'green') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        onChangePro({ ...pro, focusPeakingColor: c.id });
                      }}
                      title={`Focus Peaking Color: ${c.id}`}
                      aria-label={`Peaking color ${c.id}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeParam === 'WB' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                'Auto',
                'Daylight',
                'Cloudy',
                'Shade',
                'Tungsten',
                'Fluorescent',
                'Manual',
              ] as WhiteBalancePreset[]
            ).map((wb) => (
              <button
                key={wb}
                type="button"
                onClick={() => onChangePro({ ...pro, whiteBalance: wb })}
                className={`h-7 px-2.5 rounded-full text-[11px] cursor-pointer shrink-0 ${
                  pro.whiteBalance === wb
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/10 text-white/75 hover:bg-white/20'
                }`}
              >
                {wb}
              </button>
            ))}
          </div>
          {pro.whiteBalance === 'Manual' && (
            <GlassSlider
              label="Color Temperature"
              value={pro.kelvin}
              min={2500}
              max={9000}
              step={100}
              unit="K"
              onChange={(k) => onChangePro({ ...pro, kelvin: k })}
            />
          )}
        </div>
      )}

      {activeParam === 'EV' && (
        <GlassSlider
          label="Exposure Compensation"
          value={pro.ev}
          min={-3.0}
          max={3.0}
          step={0.1}
          formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} EV`}
          onChange={(v) => onChangePro({ ...pro, ev: v })}
          onReset={() => onChangePro({ ...pro, ev: 0 })}
        />
      )}
    </div>
  );
};

export interface FilterStripPanelProps {
  open: boolean;
  selectedFilter: FilterId;
  filterIntensity: number;
  styleTone?: number;
  styleWarmth?: number;
  onChangeStyleTone?: (val: number) => void;
  onChangeStyleWarmth?: (val: number) => void;
  onSelectFilter: (id: FilterId) => void;
  onChangeIntensity: (val: number) => void;
  onClose: () => void;
}

export const FilterStripPanel: React.FC<FilterStripPanelProps> = ({
  open,
  selectedFilter,
  filterIntensity,
  styleTone = 0,
  styleWarmth = 0,
  onChangeStyleTone,
  onChangeStyleWarmth,
  onSelectFilter,
  onChangeIntensity,
  onClose,
}) => {
  const [modeTab, setModeTab] = useState<'styles' | 'filters'>('styles');
  const [activeStyleId, setActiveStyleId] =
    useState<PhotographicStyleId>('standard');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!open) return null;

  const CATEGORIES: string[] = [
    'All',
    'iOS Styles',
    'Kodak Film',
    'Fuji Film',
    'Polaroid & Instant',
    'Vintage Decades',
    'Classic Cameras',
    'Cinema & 35mm',
    'B&W Darkroom',
    'Atmospheric & Creative',
  ];

  const filteredList = PHOTOGRAPHIC_FILTERS.filter((f) => {
    const matchesCat =
      selectedCategory === 'All' || f.category === selectedCategory;
    const matchesQuery =
      searchFilter.trim() === '' ||
      f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (f.description &&
        f.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (f.year && f.year.includes(searchFilter));
    return matchesCat && matchesQuery;
  });

  const activeFilterDef =
    PHOTOGRAPHIC_FILTERS.find((f) => f.id === selectedFilter) ||
    PHOTOGRAPHIC_FILTERS[0];

  const getSwatchBackground = (category: string, sepia: number, sat: number) => {
    if (sat === 0 || category === 'B&W Darkroom') {
      return 'linear-gradient(135deg, #09090b 0%, #52525b 50%, #f4f4f5 100%)';
    }
    if (sepia > 0.35) {
      return 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #fef3c7 100%)';
    }
    if (category === 'Kodak Film') {
      return 'linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #fef08a 100%)';
    }
    if (category === 'Fuji Film') {
      return 'linear-gradient(135deg, #064e3b 0%, #059669 45%, #6ee7b7 100%)';
    }
    if (category === 'Polaroid & Instant') {
      return 'linear-gradient(135deg, #18181b 0%, #fbbf24 35%, #ec4899 70%, #fef08a 100%)';
    }
    if (category === 'Cinema & 35mm') {
      return 'linear-gradient(135deg, #083344 0%, #0e7490 40%, #ea580c 100%)';
    }
    if (category === 'Vintage Decades') {
      return 'linear-gradient(135deg, #3b0764 0%, #9a3412 50%, #fed7aa 100%)';
    }
    return 'linear-gradient(135deg, #1e3a8a 0%, #c026d3 50%, #f59e0b 100%)';
  };

  return (
    <div
      className="w-full max-w-md mx-auto rounded-3xl liquid-glass-heavy p-3 space-y-2.5 animate-fadeIn"
      role="region"
      aria-label="Photographic Styles and Filters"
    >
      {/* Top Header Mode Switcher & Close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full">
          <button
            type="button"
            onClick={() => setModeTab('styles')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
              modeTab === 'styles'
                ? 'bg-white text-black font-semibold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Photographic Styles
          </button>
          <button
            type="button"
            onClick={() => setModeTab('filters')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
              modeTab === 'filters'
                ? 'bg-white text-black font-semibold'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Filters ({PHOTOGRAPHIC_FILTERS.length})
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Photographic Styles and Filters"
          className="w-7 h-7 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {modeTab === 'styles' ? (
        <div className="space-y-3">
          {/* Authentic iPhone Photographic Styles */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {PHOTOGRAPHIC_STYLES.map((st) => {
              const isSelected = activeStyleId === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setActiveStyleId(st.id);
                    onSelectFilter(st.mappedFilterId);
                    onChangeStyleTone?.(st.defaultTone);
                    onChangeStyleWarmth?.(st.defaultWarmth);
                  }}
                  aria-label={`Photographic Style ${st.name}`}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>

          {/* Tone & Warmth Fine Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
            <GlassSlider
              label="Tone"
              value={styleTone}
              min={-100}
              max={100}
              step={1}
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
              onChange={(v) => onChangeStyleTone?.(v)}
            />
            <GlassSlider
              label="Warmth"
              value={styleWarmth}
              min={-100}
              max={100}
              step={1}
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
              onChange={(v) => onChangeStyleWarmth?.(v)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-white/10 text-white/75 hover:bg-white/15'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search 108+ filters, Kodak, Polaroid, Leica, Provia..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/8 border border-white/10 text-[11px] text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Horizontal Scrollable 108 Filter Swatches */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {filteredList.map((f) => {
              const isSelected = f.id === selectedFilter;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    onSelectFilter(f.id);
                  }}
                  aria-label={`Filter ${f.name}`}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-white/20 border border-white/50 shadow-md scale-103'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden relative border border-white/25 flex flex-col justify-end p-1 shadow-inner"
                    style={{
                      filter: `contrast(${f.contrast}) saturate(${f.saturation}) brightness(${f.brightness}) sepia(${f.sepia}) hue-rotate(${f.hueRotate}deg)`,
                      background: getSwatchBackground(
                        f.category,
                        f.sepia,
                        f.saturation
                      ),
                    }}
                  >
                    {f.tintOverlay && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundColor: f.tintOverlay }}
                      />
                    )}
                    {f.year && (
                      <span className="relative z-10 text-[8px] font-mono-tabular font-bold px-1 py-0.2 rounded bg-black/60 text-white/90 leading-tight w-fit">
                        {f.year}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] max-w-[56px] truncate text-center ${
                      isSelected ? 'text-white font-semibold' : 'text-white/75'
                    }`}
                  >
                    {f.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Info Banner */}
          <div className="p-2 rounded-xl bg-white/6 border border-white/10 flex items-center justify-between gap-2 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white truncate">
                  {activeFilterDef.name}
                </span>
                {activeFilterDef.year && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/15 text-white/80 font-mono-tabular">
                    {activeFilterDef.year}
                  </span>
                )}
                <span className="text-[9px] text-white/50">
                  • {activeFilterDef.category}
                </span>
              </div>
              <p className="text-[10px] text-white/65 line-clamp-1 leading-tight mt-0.5">
                {activeFilterDef.description}
              </p>
            </div>
          </div>

          {selectedFilter !== 'original' && (
            <GlassSlider
              label="Filter Intensity"
              value={filterIntensity}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={onChangeIntensity}
              onReset={() => onChangeIntensity(100)}
            />
          )}
        </div>
      )}
    </div>
  );
};

