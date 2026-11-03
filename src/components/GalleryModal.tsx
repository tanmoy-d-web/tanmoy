import React, { useState } from 'react';
import {
  Heart,
  Trash2,
  Share2,
  Sliders,
  Info,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Film,
  FolderHeart,
  Camera,
  Aperture,
  Calendar,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  parseExifMetadataDisplay,
  type CapturedMediaItem,
} from '../engine/cameraEngine';
import {
  GlassButton,
  GlassCircleButton,
  triggerHaptic,
} from './GlassUI';

export interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  items: CapturedMediaItem[];
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: CapturedMediaItem) => void;
}

type GallerySection = 'Recent' | 'Photos' | 'Videos' | 'Albums' | 'Favourites';

export const GalleryModal: React.FC<GalleryModalProps> = ({
  open,
  onClose,
  items,
  onToggleFavorite,
  onDeleteItem,
  onEditItem,
}) => {
  const [activeSection, setActiveSection] = useState<GallerySection>('Recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExifInfo, setShowExifInfo] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);

  if (!open) return null;

  const filteredItems = items.filter((it) => {
    if (activeSection === 'Photos') return it.type === 'photo';
    if (activeSection === 'Videos') return it.type === 'video';
    if (activeSection === 'Favourites') return it.favorite;
    return true;
  });

  const selectedIndex = filteredItems.findIndex((it) => it.id === selectedId);
  const activeItem =
    selectedIndex >= 0 ? filteredItems[selectedIndex] : null;
  const parsedExif = activeItem ? parseExifMetadataDisplay(activeItem) : null;

  const handleDownload = (item: CapturedMediaItem) => {
    triggerHaptic(8);
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `iCamPro_${item.id}.${item.type === 'video' ? 'webm' : 'jpg'}`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Apple Photos Style Library"
    >
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 liquid-glass-heavy shrink-0">
        {activeItem ? (
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setViewerZoom(1);
            }}
            aria-label="Back to All Photos"
            className="flex items-center gap-1 text-sm font-medium text-white hover:text-white/80 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>All Photos</span>
          </button>
        ) : (
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Photos
            </h2>
            <p className="text-xs text-white/50">
              {items.length} items · iCam Pro Library
            </p>
          </div>
        )}

        {activeItem ? (
          <div className="flex items-center gap-2">
            <GlassCircleButton
              size="sm"
              active={showExifInfo}
              ariaLabel="Info"
              onClick={() => {
                triggerHaptic('selection');
                setShowExifInfo(!showExifInfo);
              }}
              title="Toggle EXIF Info Overlay"
            >
              <Info className="w-4 h-4" />
            </GlassCircleButton>
            <GlassCircleButton
              size="sm"
              ariaLabel="Zoom Out"
              onClick={() => setViewerZoom(Math.max(1, viewerZoom - 0.5))}
            >
              <ZoomOut className="w-4 h-4" />
            </GlassCircleButton>
            <span className="text-xs font-mono-tabular text-white/80">
              {viewerZoom.toFixed(1)}x
            </span>
            <GlassCircleButton
              size="sm"
              ariaLabel="Zoom In"
              onClick={() => setViewerZoom(Math.min(3, viewerZoom + 0.5))}
            >
              <ZoomIn className="w-4 h-4" />
            </GlassCircleButton>
            <button
              type="button"
              onClick={() => onEditItem(activeItem)}
              aria-label="Edit in Studio"
              className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold text-white cursor-pointer"
            >
              Edit
            </button>
          </div>
        ) : (
          <GlassCircleButton
            size="sm"
            ariaLabel="Close Gallery"
            onClick={() => {
              setSelectedId(null);
              onClose();
            }}
          >
            <X className="w-4 h-4" />
          </GlassCircleButton>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl w-full mx-auto">
        {activeItem && parsedExif ? (
          <div className="h-full flex flex-col justify-between gap-4">
            {/* Full-Screen Single Photo Viewer + Floating Info Overlay */}
            <div className="relative flex-1 min-h-[48vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
              <img
                src={activeItem.dataUrl}
                alt={`Captured ${activeItem.exif.mode} item`}
                referrerPolicy="no-referrer"
                style={{ transform: `scale(${viewerZoom})` }}
                className="max-h-[62vh] max-w-full object-contain transition-transform duration-200"
              />

              {/* Top-left Quick Optical Telemetry Pill on Viewer */}
              <div className="absolute top-3 left-3 pointer-events-none px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[11px] font-mono-tabular text-white/90 flex items-center gap-2 shadow-lg">
                <span>{parsedExif.focalLength35mm}</span>
                <span className="text-white/40">·</span>
                <span>{parsedExif.apertureDisplay}</span>
                <span className="text-white/40">·</span>
                <span>{parsedExif.shutterSpeedDisplay}</span>
                <span className="text-white/40">·</span>
                <span>{parsedExif.isoDisplay}</span>
              </div>

              {selectedIndex > 0 && (
                <button
                  type="button"
                  aria-label="Previous Photo"
                  onClick={() => {
                    setSelectedId(filteredItems[selectedIndex - 1].id);
                    setViewerZoom(1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {selectedIndex < filteredItems.length - 1 && (
                <button
                  type="button"
                  aria-label="Next Photo"
                  onClick={() => {
                    setSelectedId(filteredItems[selectedIndex + 1].id);
                    setViewerZoom(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Authentic iOS Photos EXIF Metadata Info Overlay Sheet */}
            {showExifInfo && (
              <div
                role="region"
                aria-label="EXIF Metadata Info Overlay"
                className="rounded-2xl liquid-glass-heavy border border-white/15 p-4 space-y-3 text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                {/* Header Row: Date, Time & Close */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/70" />
                    <div>
                      <span className="font-semibold text-white block">
                        {parsedExif.dateFormatted} · {parsedExif.timeFormatted}
                      </span>
                      <span className="text-[11px] text-white/50">
                        {parsedExif.deviceModel} · {parsedExif.captureMode} Mode
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-mono-tabular font-semibold text-white">
                      {parsedExif.fileFormat}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowExifInfo(false)}
                      aria-label="Close EXIF Info Overlay"
                      className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Camera & Lens Hardware Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-white/80 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-white/45 block">
                        Lens & Optical Module
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {parsedExif.lensModel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <span className="text-[10px] text-white/45 block">
                      Resolution & Size
                    </span>
                    <span className="text-white font-medium">
                      {parsedExif.megapixelsDisplay} • {parsedExif.dimensionsDisplay} • {parsedExif.estimatedFileSizeMb}
                    </span>
                  </div>
                </div>

                {/* 5-Column iOS Camera EXIF Telemetry Strip (ISO, Focal Length, EV, Aperture, Shutter Speed) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono-tabular">
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <span className="text-[10px] text-white/45 block uppercase">
                      Focal Length
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {parsedExif.focalLength35mm}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <span className="text-[10px] text-white/45 block uppercase">
                      Aperture
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {parsedExif.apertureDisplay}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <span className="text-[10px] text-white/45 block uppercase">
                      Shutter Speed
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {parsedExif.shutterSpeedDisplay}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <span className="text-[10px] text-white/45 block uppercase">
                      ISO Sensitivity
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {parsedExif.isoDisplay}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-white/45 block uppercase">
                      Exposure Bias
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {parsedExif.evDisplay}
                    </span>
                  </div>
                </div>

                {/* Color Space, Filter Profile & GPS Stamp Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-white/70">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white/60" />
                    <span>Color Profile: <strong className="text-white">{parsedExif.colorProfile}</strong></span>
                    <span className="text-white/30">·</span>
                    <span>Filter: <strong className="text-white">{parsedExif.filterUsed}</strong></span>
                  </div>
                  {activeItem.stampSnapshot?.locationName && (
                    <div className="flex items-center gap-1 text-white/75">
                      <MapPin className="w-3.5 h-3.5 text-white/60" />
                      <span>
                        {activeItem.stampSnapshot.locationName} ({activeItem.stampSnapshot.gpsCoordinates})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Apple Photos Bottom Action Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
              <GlassCircleButton
                size="md"
                ariaLabel="Share or Download Photo"
                onClick={() => handleDownload(activeItem)}
              >
                <Share2 className="w-4 h-4" />
              </GlassCircleButton>

              <GlassCircleButton
                size="md"
                active={activeItem.favorite}
                ariaLabel="Favourite Photo"
                onClick={() => onToggleFavorite(activeItem.id)}
              >
                <Heart
                  className={`w-4 h-4 ${
                    activeItem.favorite ? 'fill-current' : ''
                  }`}
                />
              </GlassCircleButton>

              <GlassCircleButton
                size="md"
                active={showExifInfo}
                ariaLabel="Toggle EXIF Metadata Info"
                onClick={() => {
                  triggerHaptic('selection');
                  setShowExifInfo(!showExifInfo);
                }}
              >
                <Info className="w-4 h-4" />
              </GlassCircleButton>

              <GlassCircleButton
                size="md"
                ariaLabel="Edit Photo"
                onClick={() => onEditItem(activeItem)}
              >
                <Sliders className="w-4 h-4" />
              </GlassCircleButton>

              <GlassCircleButton
                size="md"
                ariaLabel="Delete Photo"
                onClick={() => {
                  onDeleteItem(activeItem.id);
                  setSelectedId(null);
                }}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </GlassCircleButton>
            </div>
          </div>
        ) : activeSection === 'Albums' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: 'Recents',
                count: items.length,
                filter: () => setActiveSection('Recent'),
              },
              {
                title: 'Favourites',
                count: items.filter((i) => i.favorite).length,
                filter: () => setActiveSection('Favourites'),
              },
              {
                title: 'Videos',
                count: items.filter((i) => i.type === 'video').length,
                filter: () => setActiveSection('Videos'),
              },
            ].map((alb) => (
              <button
                key={alb.title}
                type="button"
                onClick={alb.filter}
                className="rounded-2xl liquid-glass p-4 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <FolderHeart className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      {alb.title}
                    </span>
                    <span className="text-xs text-white/55 font-mono-tabular">
                      {alb.count}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-white/50 text-sm">
            No photos or videos in {activeSection}.
          </div>
        ) : (
          /* Clean Apple Photos Edge-to-Edge Grid */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
            {filteredItems.map((it) => (
              <div
                key={it.id}
                className="group relative aspect-square overflow-hidden bg-white/5 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(it.id)}
                  aria-label={`View ${it.exif.mode} item ${it.id}`}
                  className="w-full h-full block cursor-pointer"
                >
                  <img
                    src={it.dataUrl}
                    alt={`${it.exif.mode} capture`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>

                {/* Quick EXIF Info Overlay Button on Grid Thumbnail */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('selection');
                    setSelectedId(it.id);
                    setShowExifInfo(true);
                  }}
                  aria-label={`Inspect EXIF Info for ${it.id}`}
                  title={`${it.exif.focalLengthMm}mm · f/${it.exif.apertureFStop} · ${it.exif.shutterSpeed}s · ISO ${it.exif.iso}`}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/85 hover:text-white hover:bg-black/80 transition-opacity cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {it.favorite && (
                  <Heart className="pointer-events-none absolute bottom-1.5 left-1.5 w-3.5 h-3.5 fill-white text-white drop-shadow" />
                )}

                {it.type === 'video' ? (
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 text-[10px] font-mono-tabular text-white drop-shadow flex items-center gap-0.5">
                    <Film className="w-3 h-3" />
                    <span>0:0{it.durationSec || 4}</span>
                  </span>
                ) : (
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[9px] font-mono-tabular text-white/90">
                    {it.exif.focalLengthMm}mm
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating Pill Section Switcher (Years / Months / All Photos style) */}
      {!activeItem && (
        <div className="py-3 px-4 flex justify-center shrink-0">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-full liquid-glass-heavy"
            role="tablist"
            aria-label="Gallery Sections"
          >
            {(
              ['Recent', 'Photos', 'Videos', 'Albums', 'Favourites'] as GallerySection[]
            ).map((sec) => (
              <button
                key={sec}
                type="button"
                role="tab"
                aria-selected={activeSection === sec}
                onClick={() => {
                  triggerHaptic(6);
                  setActiveSection(sec);
                  setSelectedId(null);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeSection === sec
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
