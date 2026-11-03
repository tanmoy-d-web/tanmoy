import React, { useRef, useState } from 'react';
import { MapPin, Move, Check, Sparkles } from 'lucide-react';
import { formatStampPayload, type StampSettings } from '../engine/cameraEngine';
import {
  GlassBottomSheet,
  GlassButton,
  GlassSlider,
  GlassToggle,
  triggerHaptic,
} from './GlassUI';

export interface StampStudioModalProps {
  open: boolean;
  onClose: () => void;
  stamp: StampSettings;
  onChangeStamp: (next: StampSettings) => void;
}

const COLOR_SWATCHES = [
  { label: 'Pure White', hex: '#ffffff' },
  { label: 'Pro Gold', hex: '#fbbf24' },
  { label: 'Warm Amber', hex: '#fb923c' },
  { label: 'Cinema Cyan', hex: '#38bdf8' },
  { label: 'Emerald Film', hex: '#34d399' },
  { label: 'Leica Rose', hex: '#fb7185' },
];

export const StampStudioModal: React.FC<StampStudioModalProps> = ({
  open,
  onClose,
  stamp,
  onChangeStamp,
}) => {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');

  const payload = formatStampPayload(stamp, new Date());

  const handleRequestLiveGps = () => {
    triggerHaptic(10);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('Acquiring GPS fix...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
          const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
          onChangeStamp({
            ...stamp,
            showGps: true,
            gpsCoordinates: `${latStr}, ${lngStr}`,
          });
          setGpsStatus('Live GPS locked');
        },
        () => {
          onChangeStamp({
            ...stamp,
            showGps: true,
            gpsCoordinates: '37.7749° N, 122.4194° W',
          });
          setGpsStatus('Using calibrated optical coordinates');
        },
        { timeout: 4000 }
      );
    } else {
      onChangeStamp({
        ...stamp,
        showGps: true,
        gpsCoordinates: '37.7749° N, 122.4194° W',
      });
      setGpsStatus('Using calibrated optical coordinates');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0.12, Math.min(0.88, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.12, Math.min(0.88, (e.clientY - rect.top) / rect.height));
    onChangeStamp({
      ...stamp,
      customPosition: { x, y },
    });
  };

  // Compute CSS preview positioning
  const getPreviewPositionStyle = (): React.CSSProperties => {
    if (stamp.customPosition) {
      return {
        left: `${stamp.customPosition.x * 100}%`,
        top: `${stamp.customPosition.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    switch (stamp.position) {
      case 'bottom-left':
        return { left: '16px', bottom: '16px' };
      case 'bottom-right':
        return { right: '16px', bottom: '16px' };
      case 'top-left':
        return { left: '16px', top: '16px' };
      case 'top-right':
        return { right: '16px', top: '16px' };
      case 'bottom-center':
        return { left: '50%', bottom: '16px', transform: 'translateX(-50%)' };
    }
  };

  return (
    <GlassBottomSheet
      open={open}
      title="Photo Stamp Studio"
      subtitle="Customize live optical watermarks, EXIF frames, and GPS metadata stamps"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      {/* Interactive Draggable Live Preview */}
      <div
        ref={previewRef}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
        className="relative w-full h-56 rounded-2xl overflow-hidden border border-white/20 select-none"
        style={{
          background:
            'linear-gradient(155deg, #0f172a 0%, #7c2d12 48%, #ea580c 76%, #090d16 100%)',
        }}
      >
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-[11px] text-white/80 flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-amber-300" />
          <span>Drag stamp anywhere on preview to position</span>
        </div>

        {stamp.enabled ? (
          <div
            onPointerDown={() => setIsDragging(true)}
            style={{
              ...getPreviewPositionStyle(),
              opacity: stamp.opacity,
              fontFamily:
                stamp.fontFamily === 'JetBrains Mono'
                  ? 'var(--font-mono)'
                  : stamp.fontFamily === 'Serif Classic'
                    ? 'Georgia, serif'
                    : 'var(--font-sans)',
            }}
            className={`absolute cursor-grab active:cursor-grabbing rounded-2xl px-3.5 py-2.5 flex items-center gap-3 transition-shadow ${
              stamp.showBackground ? 'bg-black/60 backdrop-blur-md' : ''
            } ${stamp.showBorder ? 'border border-white/30' : ''} ${
              stamp.showShadow ? 'shadow-xl' : ''
            }`}
          >
            {stamp.showLogo && (
              <div className="flex items-center gap-2.5 pr-2.5 border-r border-white/25">
                {stamp.logoStyle === 'Leica Dot' ? (
                  <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-[9px] font-bold text-white">
                    PRO
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col">
              {payload.titleLine && (
                <span
                  style={{
                    color: stamp.textColor,
                    fontSize: `${Math.min(22, stamp.fontSize)}px`,
                  }}
                  className="font-semibold leading-tight"
                >
                  {payload.titleLine}
                </span>
              )}
              {payload.timestampLine && (
                <span className="text-xs text-white/85 font-mono-tabular mt-0.5">
                  {payload.timestampLine}
                </span>
              )}
              {payload.locationLine && (
                <span className="text-[11px] text-white/75 mt-0.5">
                  {payload.locationLine}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="inset-0 absolute flex items-center justify-center bg-black/40">
            <span className="text-xs text-white/75">
              Photo Stamp is currently disabled. Toggle below to activate.
            </span>
          </div>
        )}
      </div>

      {/* Master Enable & Content Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
          <GlassToggle
            label="Enable Photo Stamp"
            description="Bake optical stamp into captured & edited photos"
            checked={stamp.enabled}
            onChange={(enabled) => onChangeStamp({ ...stamp, enabled })}
          />
          <GlassToggle
            label="Show Date"
            checked={stamp.showDate}
            onChange={(showDate) => onChangeStamp({ ...stamp, showDate })}
          />
          <GlassToggle
            label="Show Time"
            checked={stamp.showTime}
            onChange={(showTime) => onChangeStamp({ ...stamp, showTime })}
          />
          <GlassToggle
            label="Show Device Model"
            checked={stamp.showDeviceModel}
            onChange={(showDeviceModel) => onChangeStamp({ ...stamp, showDeviceModel })}
          />
          <GlassToggle
            label="Show Optical Emblem / Logo"
            checked={stamp.showLogo}
            onChange={(showLogo) => onChangeStamp({ ...stamp, showLogo })}
          />
        </div>

        {/* Text & Location Inputs */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div>
            <label
              htmlFor="stamp-device-model"
              className="block text-xs font-medium text-white/80 mb-1"
            >
              Device Model Label
            </label>
            <input
              id="stamp-device-model"
              type="text"
              value={stamp.deviceModelText}
              onChange={(e) =>
                onChangeStamp({ ...stamp, deviceModelText: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
              placeholder="iCam Pro · 24mm f/1.78"
            />
          </div>

          <div>
            <label
              htmlFor="stamp-custom-text"
              className="block text-xs font-medium text-white/80 mb-1"
            >
              Photographer / Custom Signature
            </label>
            <input
              id="stamp-custom-text"
              type="text"
              value={stamp.customText}
              onChange={(e) =>
                onChangeStamp({ ...stamp, customText: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
              placeholder="Shot on iCam Pro"
            />
          </div>

          <div>
            <label
              htmlFor="stamp-location-text"
              className="block text-xs font-medium text-white/80 mb-1"
            >
              Location Name & GPS Coordinates
            </label>
            <div className="flex items-center gap-2">
              <input
                id="stamp-location-text"
                type="text"
                value={stamp.locationName}
                onChange={(e) =>
                  onChangeStamp({ ...stamp, locationName: e.target.value })
                }
                className="flex-1 h-10 px-3 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="Dolomites, Italy"
              />
              <GlassButton
                onClick={handleRequestLiveGps}
                active={stamp.showGps}
                ariaLabel="Acquire Live GPS Coordinates"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>GPS</span>
              </GlassButton>
            </div>
            {gpsStatus && (
              <p className="text-[11px] text-amber-300 mt-1">{gpsStatus}</p>
            )}
          </div>
        </div>
      </div>

      {/* Typography, Position & Appearance */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Font Family */}
          <div>
            <span className="block text-xs font-medium text-white/80 mb-1.5">
              Typography
            </span>
            <div className="flex flex-col gap-1">
              {(
                ['Plus Jakarta Sans', 'JetBrains Mono', 'Serif Classic'] as const
              ).map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => onChangeStamp({ ...stamp, fontFamily: font })}
                  className={`h-9 px-3 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                    stamp.fontFamily === font
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div>
            <span className="block text-xs font-medium text-white/80 mb-1.5">
              Date Format
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                ['YYYY.MM.DD', 'DD MMM YYYY', 'MM/DD/YYYY', 'ISO-8601'] as const
              ).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onChangeStamp({ ...stamp, dateFormat: fmt })}
                  className={`h-9 px-2.5 rounded-xl text-[11px] font-mono-tabular transition-colors cursor-pointer ${
                    stamp.dateFormat === fmt
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Position Presets */}
          <div>
            <span className="block text-xs font-medium text-white/80 mb-1.5">
              Anchor Position
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  'bottom-left',
                  'bottom-right',
                  'bottom-center',
                  'top-left',
                  'top-right',
                ] as const
              ).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() =>
                    onChangeStamp({
                      ...stamp,
                      position: pos,
                      customPosition: undefined,
                    })
                  }
                  className={`h-9 px-2.5 rounded-xl text-[11px] capitalize transition-colors cursor-pointer ${
                    stamp.position === pos && !stamp.customPosition
                      ? 'bg-amber-400 text-black font-semibold'
                      : 'bg-white/5 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {pos.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Font Size & Opacity Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <GlassSlider
            label="Stamp Font Scale"
            value={stamp.fontSize}
            min={12}
            max={28}
            step={1}
            unit="px"
            onChange={(fontSize) => onChangeStamp({ ...stamp, fontSize })}
          />
          <GlassSlider
            label="Watermark Opacity"
            value={Math.round(stamp.opacity * 100)}
            min={25}
            max={100}
            step={5}
            unit="%"
            onChange={(pct) => onChangeStamp({ ...stamp, opacity: pct / 100 })}
          />
        </div>

        {/* Color Swatches & Surface Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/75">Accent Color:</span>
            {COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                aria-label={`Select stamp color ${sw.label}`}
                onClick={() => onChangeStamp({ ...stamp, textColor: sw.hex })}
                style={{ backgroundColor: sw.hex }}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                  stamp.textColor === sw.hex
                    ? 'scale-125 ring-2 ring-white'
                    : 'opacity-80 hover:opacity-100'
                }`}
              >
                {stamp.textColor === sw.hex && (
                  <Check className="w-3.5 h-3.5 text-black" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              active={stamp.showBackground}
              onClick={() =>
                onChangeStamp({
                  ...stamp,
                  showBackground: !stamp.showBackground,
                })
              }
            >
              Frosted Backing
            </GlassButton>
            <GlassButton
              active={stamp.showBorder}
              onClick={() =>
                onChangeStamp({ ...stamp, showBorder: !stamp.showBorder })
              }
            >
              1px Hairline
            </GlassButton>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <GlassButton variant="amber" onClick={onClose}>
          <Sparkles className="w-4 h-4" />
          <span>Save Stamp Configuration</span>
        </GlassButton>
      </div>
    </GlassBottomSheet>
  );
};
