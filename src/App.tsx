import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Zap,
  ZapOff,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Sun,
  Lock,
  Unlock,
  Aperture,
  Moon,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  buildCssFilterString,
  computeExposureMultiplier,
  computeLuminanceHistogram,
  DEFAULT_PHOTO_ADJUSTMENTS,
  formatStampPayload,
  getEffectiveKelvin,
  getOpticalLensSpec,
  PHOTOGRAPHIC_FILTERS,
  synthesizeExifData,
  type AspectRatioOption,
  type CameraMode,
  type CapturedMediaItem,
  type FilterId,
  type FlashMode,
  type ProControlsState,
  type StampSettings,
  type TimerSeconds,
  type VideoFps,
  type VideoResolution,
} from './engine/cameraEngine';
import {
  drawOpticalScene,
  renderCapturedPhotoToDataUrl,
  type OpticalSceneId,
} from './engine/sceneSynthesizer';
import {
  GlassCircleButton,
  GlassPill,
  triggerHaptic,
} from './components/GlassUI';
import {
  CameraModeSelector,
  ExpandableControlCenter,
  FilterStripPanel,
  ProCameraPanel,
  ZoomSelector,
} from './components/CameraOverlayControls';
import { StampStudioModal } from './components/StampStudioModal';
import { PhotoVideoEditorModal } from './components/PhotoVideoEditorModal';
import { GalleryModal } from './components/GalleryModal';
import {
  SettingsAndHardwareModal,
  type AppSettingsState,
  type DetectedHardwareCapabilities,
} from './components/SettingsAndHardwareModal';

function playShutterClick(enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  } catch {
    // Ignore audio context restrictions
  }
}

export default function App() {
  // Primary Camera Mode & Optical State
  const [activeMode, setActiveMode] = useState<CameraMode>('Photo');
  const [flash, setFlash] = useState<FlashMode>('Auto');
  const [timer, setTimer] = useState<TimerSeconds>(0);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:3');
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(false);
  const [flipRotationDeg, setFlipRotationDeg] = useState<number>(0);
  const [hdrEnabled, setHdrEnabled] = useState<boolean>(true);
  const [rawEnabled, setRawEnabled] = useState<boolean>(false);
  const [livePhoto, setLivePhoto] = useState<boolean>(false);
  const [stabilization, setStabilization] = useState<boolean>(true);
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('4K');
  const [videoFps, setVideoFps] = useState<VideoFps>(60);
  const [ev, setEv] = useState<number>(0);

  // Portrait, Cinematic, Night, and Panorama Mode States
  const [portraitAperture, setPortraitAperture] = useState<number>(2.8); // f/1.4 .. f/16
  const [nightDurationSec, setNightDurationSec] = useState<number>(3);
  const [panoProgress, setPanoProgress] = useState<number>(0);
  const [isCapturingPano, setIsCapturingPano] = useState<boolean>(false);

  // Video Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Focus & AE/AF Lock Reticle State
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.44,
  });
  const [showFocusReticle, setShowFocusReticle] = useState<boolean>(false);
  const [aeAfLocked, setAeAfLocked] = useState<boolean>(false);
  const [horizonAngleDeg] = useState<number>(0.0);
  const focusTimeoutRef = useRef<number | null>(null);

  // Active Photographic Style / Filter & Tone/Warmth
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('original');
  const [filterIntensity, setFilterIntensity] = useState<number>(100);
  const [styleTone, setStyleTone] = useState<number>(0);
  const [styleWarmth, setStyleWarmth] = useState<number>(0);

  const [quickFilterOpen, setQuickFilterOpen] = useState<boolean>(false);

  // Pro Mode Controls
  const [proControls, setProControls] = useState<ProControlsState>({
    iso: 'Auto',
    shutterSpeed: 'Auto',
    focusDistance: 'Auto',
    whiteBalance: 'Auto',
    kelvin: 5600,
    ev: 0,
    rawDng: true,
    histogramEnabled: true,
    focusPeakingEnabled: true,
    focusPeakingColor: 'green',
  });

  // Photo Stamp Studio State (Default disabled on main viewfinder for clean iPhone look; toggleable in Control Panel / Stamp Studio)
  const [stamp, setStamp] = useState<StampSettings>({
    enabled: false,
    showDate: true,
    showTime: true,
    showDeviceModel: true,
    deviceModelText: 'iCam Pro · 24mm f/1.78',
    customText: 'Shot on iCam Pro',
    showGps: true,
    gpsCoordinates: '46.5405° N, 12.1357° E',
    locationName: 'Dolomites, Italy',
    showLogo: true,
    logoStyle: 'Minimal Pro',
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    textColor: '#ffffff',
    opacity: 0.9,
    showBackground: true,
    showBorder: true,
    showShadow: true,
    position: 'bottom-left',
    dateFormat: 'YYYY.MM.DD',
  });

  // App Settings & Hardware Capabilities
  const [settings, setSettings] = useState<AppSettingsState>({
    photoQuality: 'Apple ProRAW 48MP (DNG)',
    videoResolution: '4K',
    videoFps: 60,
    defaultLens: '1x Main 24mm',
    defaultMode: 'Photo',
    gridEnabled: true,
    levelEnabled: true,
    timer: 0,
    flash: 'Auto',
    hdrEnabled: true,
    defaultFilter: 'original',
    hapticsEnabled: true,
    shutterSoundEnabled: true,
    saveLocationTag: true,
    storagePath: 'DCIM/iCamPro/DisplayP3',
    proRawResolution: '48MP',
    proResEnabled: true,
    proResFormat: 'ProRes 4K 60fps Log',
    sloMoFps: '240 fps',
    cinematicResolution: '4K at 30 fps',
    mirrorFrontCamera: false,
    viewOutsideFrame: true,
    enhancedStabilization: true,
    actionLowerLight: false,
    stereoAudio: true,
    windNoiseReduction: true,
    preserveCameraMode: false,
    preserveCreativeControls: false,
    preserveMacroControl: false,
    preserveExposure: false,
    preserveNightMode: false,
    fasterShooting: false,
    lensCorrection: true,
    macroControl: true,
  });

  const [hardware, setHardware] = useState<DetectedHardwareCapabilities>({
    cameraDevicesCount: 4,
    deviceLabels: [
      'Back Ultra-Wide 13mm f/2.2',
      'Back Main 24mm f/1.78',
      'Back Telephoto 77mm f/2.8',
      'Front TrueDepth 23mm f/1.9',
    ],
    hasFrontLens: true,
    hasRearLens: true,
    supportedFocalLengths: ['13mm', '24mm', '35mm', '48mm', '77mm'],
    zoomRange: '0.5x – 10.0x Optical/Hybrid',
    torchFlashSupported: true,
    continuousAfSupported: true,
    isoRange: 'ISO 50 – 6400',
    shutterRange: '1/4000s – 1.0s',
    rawDngSupported: true,
    maxResolution: '4K UHD (3840×2160)',
    supportedFps: '24 / 30 / 60 / 120 / 240 fps',
    oisStabilization: true,
    camera2HardwareLevel: 'LEVEL_3 (Full Manual + RAW DNG)',
  });

  // Floating Panels & Modals Visibility
  const [controlCenterOpen, setControlCenterOpen] = useState<boolean>(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);
  const [stampModalOpen, setStampModalOpen] = useState<boolean>(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'settings' | 'hardware' | 'kotlin'
  >('settings');
  const [editingItem, setEditingItem] = useState<CapturedMediaItem | null>(null);

  // Live Hardware Camera vs Calibrated Optical Scene Synthesizer
  const [activeSceneId, setActiveSceneId] =
    useState<OpticalSceneId>('alpine_sunset');
  const [useHardwareWebcam, setUseHardwareWebcam] = useState<boolean>(false);
  const [hasLiveWebcamStream, setHasLiveWebcamStream] = useState<boolean>(false);
  const [shutterFlashEffect, setShutterFlashEffect] = useState<boolean>(false);
  const [histogramBins, setHistogramBins] = useState<number[]>(
    new Array(20).fill(0.35)
  );

  // Media Library (Gallery)
  const [mediaItems, setMediaItems] = useState<CapturedMediaItem[]>([]);
  const [isQuickTaking, setIsQuickTaking] = useState<boolean>(false);
  const shutterTimerRef = useRef<number | null>(null);
  const isQuickTakingRef = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderStateRef = useRef({
    activeSceneId,
    zoom,
    isFrontCamera,
    portraitAperture,
    activeMode,
    proControls,
    focusPoint,
  });
  useEffect(() => {
    renderStateRef.current = {
      activeSceneId,
      zoom,
      isFrontCamera,
      portraitAperture,
      activeMode,
      proControls,
      focusPoint,
    };
  }, [
    activeSceneId,
    zoom,
    isFrontCamera,
    portraitAperture,
    activeMode,
    proControls,
    focusPoint,
  ]);

  // Seed 3 initial high-resolution photographs on mount so Gallery is immediately ready
  useEffect(() => {
    const initialScenes: {
      scene: OpticalSceneId;
      mode: CameraMode;
      zoom: number;
      filter: FilterId;
      fav: boolean;
    }[] = [
      {
        scene: 'alpine_sunset',
        mode: 'Photo',
        zoom: 1.0,
        filter: 'golden_hour',
        fav: true,
      },
      {
        scene: 'portrait_studio',
        mode: 'Portrait',
        zoom: 2.0,
        filter: 'portrait_soft',
        fav: true,
      },
      {
        scene: 'tokyo_night',
        mode: 'Night',
        zoom: 1.0,
        filter: 'cinematic',
        fav: false,
      },
    ];

    const seeded: CapturedMediaItem[] = initialScenes.map((cfg, idx) => {
      const rendered = renderCapturedPhotoToDataUrl({
        hasLiveCamera: false,
        sceneOpts: {
          sceneId: cfg.scene,
          timeSec: idx * 2.5,
          zoom: cfg.zoom,
          isFrontCamera: false,
          portraitBlurAperture: 2.0,
          isPortraitMode: cfg.mode === 'Portrait',
          isNightMode: cfg.mode === 'Night',
          manualFocus: 'Auto',
          focusPoint: { x: 0.5, y: 0.45 },
        },
        aspectRatio: '4:3',
        filterId: cfg.filter,
        filterIntensity: 100,
        exposureMultiplier: 1.0,
        kelvin: 5600,
        adjustments: {
          ...DEFAULT_PHOTO_ADJUSTMENTS,
          filterId: cfg.filter,
        },
        stamp: {
          ...stamp,
          enabled: false,
        },
      });

      return {
        id: `seed_${idx + 1}`,
        type: 'photo',
        dataUrl: rendered.processedDataUrl,
        originalDataUrl: rendered.cleanOriginalDataUrl,
        createdAt: Date.now() - (3 - idx) * 120000,
        favorite: cfg.fav,
        album: 'Recents',
        exif: synthesizeExifData({
          zoom: cfg.zoom,
          isFrontCamera: false,
          mode: cfg.mode,
          pro: proControls,
          ev: 0,
          filterId: cfg.filter,
          rawEnabled: true,
          aspectRatio: '4:3',
        }),
        adjustments: {
          ...DEFAULT_PHOTO_ADJUSTMENTS,
          filterId: cfg.filter,
        },
        stampSnapshot: stamp,
      };
    });

    setMediaItems(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enumerate real hardware cameras
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === 'function'
    ) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (videoInputs.length > 0) {
            setHardware((prev) => ({
              ...prev,
              cameraDevicesCount: Math.max(
                prev.cameraDevicesCount,
                videoInputs.length
              ),
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Connect or disconnect hardware webcam when requested
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (
      useHardwareWebcam &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        .then((stream) => {
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setHasLiveWebcamStream(true);
        })
        .catch(() => {
          setHasLiveWebcamStream(false);
          setUseHardwareWebcam(false);
        });
    } else {
      setHasLiveWebcamStream(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [useHardwareWebcam, isFrontCamera]);

  // Live Viewfinder 2D Canvas Render Loop
  useEffect(() => {
    let animId = 0;
    let frameCount = 0;
    const startTime = performance.now();

    const renderLoop = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const state = renderStateRef.current;
          const elapsedSec = (now - startTime) / 1000;

          if (
            hasLiveWebcamStream &&
            videoRef.current &&
            videoRef.current.readyState >= 2
          ) {
            ctx.save();
            if (state.isFrontCamera) {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            drawOpticalScene(ctx, canvas.width, canvas.height, {
              sceneId: state.activeSceneId,
              timeSec: elapsedSec,
              zoom: state.zoom,
              isFrontCamera: state.isFrontCamera,
              portraitBlurAperture: state.portraitAperture,
              isPortraitMode:
                state.activeMode === 'Portrait' ||
                state.activeMode === 'Cinematic',
              isNightMode: state.activeMode === 'Night',
              manualFocus:
                state.activeMode === 'Pro'
                  ? state.proControls.focusDistance
                  : 'Auto',
              focusPoint: state.focusPoint,
            });
          }

          frameCount++;

          // Focus Peaking Real-Time Visual Aid Pass for Manual Focus
          const peakingCanvas = peakingCanvasRef.current;
          if (peakingCanvas) {
            const pCtx = peakingCanvas.getContext('2d');
            const shouldRunPeaking =
              state.activeMode === 'Pro' &&
              state.proControls.focusPeakingEnabled !== false &&
              state.proControls.focusDistance !== 'Auto';

            if (shouldRunPeaking && pCtx && frameCount % 2 === 0) {
              pCtx.clearRect(0, 0, peakingCanvas.width, peakingCanvas.height);
              try {
                const imgData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const data = imgData.data;
                const pColor = state.proControls.focusPeakingColor || 'green';
                pCtx.fillStyle =
                  pColor === 'cyan'
                    ? '#00F0FF'
                    : pColor === 'red'
                      ? '#FF3366'
                      : pColor === 'yellow'
                        ? '#FFE600'
                        : '#00FF66';

                const step = 4;
                const threshold = 32;
                const w = canvas.width;
                const h = canvas.height;
                for (let y = step; y < h - step; y += step) {
                  for (let x = step; x < w - step; x += step) {
                    const idx = (y * w + x) * 4;
                    const idxR = (y * w + (x + step)) * 4;
                    const idxD = ((y + step) * w + x) * 4;
                    const lum =
                      (data[idx] * 299 +
                        data[idx + 1] * 587 +
                        data[idx + 2] * 114) >>
                      10;
                    const lumR =
                      (data[idxR] * 299 +
                        data[idxR + 1] * 587 +
                        data[idxR + 2] * 114) >>
                      10;
                    const lumD =
                      (data[idxD] * 299 +
                        data[idxD + 1] * 587 +
                        data[idxD + 2] * 114) >>
                      10;
                    const grad = Math.abs(lum - lumR) + Math.abs(lum - lumD);
                    if (grad > threshold) {
                      pCtx.fillRect(x, y, 3, 3);
                    }
                  }
                }
              } catch {
                // Ignore canvas read if any
              }
            } else if (!shouldRunPeaking && pCtx) {
              pCtx.clearRect(0, 0, peakingCanvas.width, peakingCanvas.height);
            }
          }

          if (frameCount % 25 === 0) {
            try {
              const imgData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );
              const bins = computeLuminanceHistogram(imgData.data, 20);
              setHistogramBins(bins);
            } catch {
              // Ignore cross-origin canvas read if any
            }
          }
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [hasLiveWebcamStream]);

  // Video Recording Timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const effectiveEv = activeMode === 'Pro' ? proControls.ev : ev;
  const exposureMultiplier = computeExposureMultiplier(
    effectiveEv,
    proControls,
    activeMode
  );
  const effectiveKelvin =
    activeMode === 'Pro'
      ? getEffectiveKelvin(proControls.whiteBalance, proControls.kelvin)
      : 5600 + styleWarmth * 18;

  const liveViewfinderCssFilter = buildCssFilterString(
    selectedFilter,
    filterIntensity,
    exposureMultiplier,
    {
      ...DEFAULT_PHOTO_ADJUSTMENTS,
      contrast: styleTone * 0.45,
      temperature: styleWarmth * 0.65,
    },
    effectiveKelvin
  );

  const activeLensSpec = getOpticalLensSpec(zoom, isFrontCamera);
  const isVideoLikeMode =
    activeMode === 'Video' ||
    activeMode === 'Cinematic' ||
    activeMode === 'Slo-mo' ||
    activeMode === 'Time-lapse';

  // Execute Photo or Video Capture
  const performCapture = useCallback((overrideMode?: CameraMode) => {
    triggerHaptic('shutterRelease');
    playShutterClick(settings.shutterSoundEnabled);

    setShutterFlashEffect(true);
    setTimeout(() => setShutterFlashEffect(false), 140);

    const effectiveMode = overrideMode || activeMode;
    const isVideoItem =
      effectiveMode === 'Video' ||
      effectiveMode === 'Cinematic' ||
      effectiveMode === 'Slo-mo' ||
      effectiveMode === 'Time-lapse' ||
      isQuickTaking;

    const updatedStamp: StampSettings = {
      ...stamp,
      deviceModelText:
        stamp.deviceModelText || `iCam Pro · ${activeLensSpec.lensName}`,
    };

    const rendered = renderCapturedPhotoToDataUrl({
      videoEl: videoRef.current,
      hasLiveCamera: hasLiveWebcamStream,
      sceneOpts: {
        sceneId: activeSceneId,
        timeSec: performance.now() / 1000,
        zoom,
        isFrontCamera,
        portraitBlurAperture: portraitAperture,
        isPortraitMode:
          activeMode === 'Portrait' || activeMode === 'Cinematic',
        isNightMode: activeMode === 'Night',
        manualFocus:
          activeMode === 'Pro' ? proControls.focusDistance : 'Auto',
        focusPoint,
      },
      aspectRatio,
      filterId: selectedFilter,
      filterIntensity,
      exposureMultiplier,
      kelvin: effectiveKelvin,
      adjustments: {
        ...DEFAULT_PHOTO_ADJUSTMENTS,
        filterId: selectedFilter,
        filterIntensity,
        contrast: styleTone * 0.45,
        temperature: styleWarmth * 0.65,
      },
      stamp: updatedStamp,
    });

    const exif = synthesizeExifData({
      zoom,
      isFrontCamera,
      mode: effectiveMode,
      pro: proControls,
      ev: effectiveEv,
      filterId: selectedFilter,
      rawEnabled: rawEnabled || (effectiveMode === 'Pro' && proControls.rawDng),
      aspectRatio,
    });

    const newItem: CapturedMediaItem = {
      id: `icam_${Date.now()}`,
      type: isVideoItem ? 'video' : 'photo',
      dataUrl: rendered.processedDataUrl,
      originalDataUrl: rendered.cleanOriginalDataUrl,
      durationSec: isVideoItem ? Math.max(2, recordingSeconds) : undefined,
      createdAt: Date.now(),
      favorite: false,
      album:
        effectiveMode === 'Portrait'
          ? 'Portraits'
          : isVideoItem
            ? 'Videos'
            : 'Recents',
      exif,
      adjustments: {
        ...DEFAULT_PHOTO_ADJUSTMENTS,
        filterId: selectedFilter,
        filterIntensity,
        contrast: styleTone * 0.45,
        temperature: styleWarmth * 0.65,
      },
      stampSnapshot: updatedStamp,
    };

    setMediaItems((prev) => [newItem, ...prev]);
  }, [
    settings.shutterSoundEnabled,
    stamp,
    activeLensSpec.lensName,
    hasLiveWebcamStream,
    activeSceneId,
    zoom,
    isFrontCamera,
    portraitAperture,
    activeMode,
    isQuickTaking,
    proControls,
    focusPoint,
    aspectRatio,
    selectedFilter,
    filterIntensity,
    exposureMultiplier,
    effectiveKelvin,
    styleTone,
    styleWarmth,
    effectiveEv,
    rawEnabled,
    isVideoLikeMode,
    recordingSeconds,
  ]);

  const handleShutterPress = () => {
    if (isVideoLikeMode) {
      if (isRecording) {
        setIsRecording(false);
        performCapture();
      } else {
        triggerHaptic('shutter');
        setIsRecording(true);
      }
      return;
    }

    if (activeMode === 'Panorama') {
      if (isCapturingPano) {
        setIsCapturingPano(false);
        setPanoProgress(0);
        performCapture();
      } else {
        setIsCapturingPano(true);
        setPanoProgress(15);
        triggerHaptic('shutter');
        const timerId = setInterval(() => {
          setPanoProgress((p) => {
            if (p >= 100) {
              clearInterval(timerId);
              setIsCapturingPano(false);
              performCapture();
              return 0;
            }
            return p + 25;
          });
        }, 450);
      }
      return;
    }

    if (timer > 0 && countdownLeft === null) {
      let remaining = timer;
      setCountdownLeft(remaining);
      const countInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countInterval);
          setCountdownLeft(null);
          performCapture();
        } else {
          triggerHaptic('selection');
          setCountdownLeft(remaining);
        }
      }, 1000);
      return;
    }

    performCapture();
  };

  const handleShutterPointerDown = (e: React.PointerEvent) => {
    if (isVideoLikeMode) return;
    triggerHaptic('shutter');
    isQuickTakingRef.current = false;
    if (shutterTimerRef.current) {
      clearTimeout(shutterTimerRef.current);
    }
    shutterTimerRef.current = window.setTimeout(() => {
      isQuickTakingRef.current = true;
      setIsQuickTaking(true);
      setIsRecording(true);
      triggerHaptic('longPress');
    }, 380);
  };

  const handleShutterPointerUp = (e: React.PointerEvent) => {
    if (isVideoLikeMode) {
      handleShutterPress();
      return;
    }
    if (shutterTimerRef.current) {
      clearTimeout(shutterTimerRef.current);
      shutterTimerRef.current = null;
    }
    if (isQuickTakingRef.current) {
      isQuickTakingRef.current = false;
      setIsQuickTaking(false);
      setIsRecording(false);
      triggerHaptic('shutterRelease');
      performCapture('Video');
      return;
    }
    handleShutterPress();
  };

  const handleShutterPointerCancel = () => {
    if (shutterTimerRef.current) {
      clearTimeout(shutterTimerRef.current);
      shutterTimerRef.current = null;
    }
    if (isQuickTakingRef.current) {
      isQuickTakingRef.current = false;
      setIsQuickTaking(false);
      setIsRecording(false);
      triggerHaptic('shutterRelease');
      performCapture('Video');
    }
  };

  const handleSelectMode = (mode: CameraMode) => {
    triggerHaptic('modeSwitch');
    setActiveMode(mode);
    if (
      (mode === 'Portrait' || mode === 'Cinematic') &&
      activeSceneId !== 'portrait_studio'
    ) {
      setActiveSceneId('portrait_studio');
    } else if (mode === 'Night' && activeSceneId !== 'tokyo_night') {
      setActiveSceneId('tokyo_night');
    }
  };

  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (aeAfLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0.15,
      Math.min(0.85, (e.clientX - rect.left) / rect.width)
    );
    const y = Math.max(
      0.18,
      Math.min(0.75, (e.clientY - rect.top) / rect.height)
    );
    triggerHaptic(6, settings.hapticsEnabled);
    setFocusPoint({ x, y });
    setShowFocusReticle(true);

    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = window.setTimeout(() => {
      setShowFocusReticle(false);
    }, 3500);
  };

  const latestItem = mediaItems[0] || null;
  const stampPreviewPayload = formatStampPayload(stamp, new Date());

  return (
    <main
      aria-label="iCam Pro iPhone Camera Viewfinder"
      className="fixed inset-0 w-screen h-screen bg-black text-white flex flex-col justify-between overflow-hidden select-none pt-[max(10px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      {/* Hidden hardware video element for live WebRTC stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
        aria-hidden="true"
      />

      {/* EDGE-TO-EDGE FULL-SCREEN LIVE VIEWFINDER */}
      <div
        onClick={handleViewfinderTap}
        className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
      >
        <canvas
          ref={canvasRef}
          width={900}
          height={1200}
          style={{
            filter: liveViewfinderCssFilter,
          }}
          className={`w-full h-full transition-all duration-200 ${
            aspectRatio === '1:1'
              ? 'aspect-square object-cover max-h-[60vh]'
              : aspectRatio === '16:9'
                ? 'aspect-[9/16] object-cover'
                : 'object-cover'
          }`}
        />

        {/* Real-Time Focus Peaking Visual Aid Canvas Overlay (Highlights in-focus edges with colored outlines) */}
        <canvas
          ref={peakingCanvasRef}
          width={900}
          height={1200}
          className={`pointer-events-none absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
            aspectRatio === '1:1'
              ? 'aspect-square object-cover max-h-[60vh]'
              : aspectRatio === '16:9'
                ? 'aspect-[9/16] object-cover'
                : 'object-cover'
          }`}
        />

        {/* Focus Peaking Active Status HUD Pill */}
        {activeMode === 'Pro' &&
          proControls.focusPeakingEnabled !== false &&
          proControls.focusDistance !== 'Auto' && (
            <div
              aria-label="Focus Peaking Visual Aid Active"
              className="pointer-events-none absolute top-16 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-pill text-[10px] font-mono-tabular"
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    proControls.focusPeakingColor === 'red'
                      ? '#FF3366'
                      : proControls.focusPeakingColor === 'yellow'
                        ? '#FFE600'
                        : proControls.focusPeakingColor === 'cyan'
                          ? '#00F0FF'
                          : '#00FF66',
                }}
              />
              <span className="text-white font-medium">PEAKING</span>
              <span className="text-white/60">
                {Number(proControls.focusDistance).toFixed(2)}m
              </span>
            </div>
          )}

        {/* Subtle Top & Bottom Contrast Vignette Scrims so Floating Controls are Always Legible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 via-black/25 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
        />

        {/* Shutter Capture Flash Feedback */}
        {shutterFlashEffect && (
          <div className="pointer-events-none absolute inset-0 bg-black/80 z-40 transition-opacity duration-100" />
        )}

        {/* Self-Timer Countdown Overlay */}
        {countdownLeft !== null && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <span className="text-7xl font-mono-tabular font-semibold text-white drop-shadow-2xl">
              {countdownLeft}
            </span>
          </div>
        )}

        {/* 3x3 Rule-of-Thirds Fine White Hairline Grid */}
        {settings.gridEnabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
          >
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-white/15" />
            <div className="border-r border-white/15" />
            <div />
          </div>
        )}

        {/* Authentic Minimal Horizon Level Indicator */}
        {settings.levelEnabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-75"
          >
            <div className="w-6 h-[1px] bg-white/40" />
            <div
              style={{ transform: `rotate(${horizonAngleDeg}deg)` }}
              className="w-14 h-[1.5px] bg-white"
            />
            <div className="w-6 h-[1px] bg-white/40" />
          </div>
        )}

        {/* Minimal iOS Tap-to-Focus Square & Subtle Sun Exposure Slider */}
        {showFocusReticle && (
          <div
            style={{
              left: `${focusPoint.x * 100}%`,
              top: `${focusPoint.y * 100}%`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2.5"
          >
            <div
              className={`w-16 h-16 border transition-all duration-200 relative ${
                aeAfLocked
                  ? 'border-white bg-white/10'
                  : 'border-white/80'
              }`}
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-1.5 bg-white/90" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-1.5 bg-white/90" />
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-[1px] bg-white/90" />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-[1px] bg-white/90" />
            </div>

            {/* Minimal Translucent Sun Exposure & Lock Pill */}
            <div className="flex flex-col items-center gap-1 bg-black/45 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/15">
              <button
                type="button"
                aria-label={aeAfLocked ? 'Unlock AE/AF' : 'Lock AE/AF'}
                onClick={() => {
                  triggerHaptic(10);
                  const nextLocked = !aeAfLocked;
                  setAeAfLocked(nextLocked);
                  if (focusTimeoutRef.current) {
                    window.clearTimeout(focusTimeoutRef.current);
                  }
                  if (!nextLocked) {
                    focusTimeoutRef.current = window.setTimeout(() => {
                      setShowFocusReticle(false);
                    }, 2500);
                  }
                }}
                className="text-white/90 hover:text-white cursor-pointer flex items-center gap-0.5 text-[9px] font-mono-tabular"
              >
                {aeAfLocked ? (
                  <Lock className="w-3 h-3 text-white" />
                ) : (
                  <Unlock className="w-3 h-3 opacity-70" />
                )}
              </button>
              <div className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-white/90 shrink-0" />
                <input
                  type="range"
                  aria-label="Viewfinder Exposure Adjustment"
                  min={-2.0}
                  max={2.0}
                  step={0.1}
                  value={effectiveEv}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (activeMode === 'Pro') {
                      setProControls({ ...proControls, ev: val });
                    } else {
                      setEv(val);
                    }
                    if (!aeAfLocked) {
                      if (focusTimeoutRef.current) {
                        window.clearTimeout(focusTimeoutRef.current);
                      }
                      focusTimeoutRef.current = window.setTimeout(() => {
                        setShowFocusReticle(false);
                      }, 3500);
                    }
                  }}
                  className="w-12 h-1 accent-white cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Compact Pro Luminance Histogram Overlay (Shown only in Pro Mode) */}
        {activeMode === 'Pro' && proControls.histogramEnabled && (
          <div
            aria-label="Real-time luminance histogram"
            className="pointer-events-none absolute top-16 right-4 z-20 w-28 h-12 rounded-xl liquid-glass-pill p-1.5 flex items-end gap-0.5"
          >
            {histogramBins.map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-white/85 rounded-t-xs transition-all duration-150"
                style={{ height: `${Math.max(10, Math.round(val * 100))}%` }}
              />
            ))}
          </div>
        )}

        {/* Live Watermark Stamp Badge (Only if user explicitly enabled Stamp) */}
        {stamp.enabled && !controlCenterOpen && !filterPanelOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStampModalOpen(true);
            }}
            aria-label="Customize Live Photo Stamp"
            className="absolute left-4 top-16 z-20 rounded-2xl px-3 py-1.5 liquid-glass-pill text-left flex items-center gap-2 hover:bg-white/15 transition-colors cursor-pointer max-w-[240px]"
          >
            <div className="w-2 h-2 rounded-full bg-white shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-medium text-white leading-tight truncate">
                {stampPreviewPayload.titleLine}
              </span>
              <span className="text-[9px] font-mono-tabular text-white/65 truncate">
                {stampPreviewPayload.timestampLine}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 1. AUTHENTIC IPHONE TOP CONTROL BAR */}
      <header className="relative z-30 w-[94%] max-w-md mx-auto flex items-center justify-between px-3 py-1.5 mt-2 rounded-full liquid-glass-pill backdrop-blur-2xl border border-white/15 shadow-xl">
        {/* Top Left: Flash Icon + Optional Night / RAW Indicator */}
        <div className="flex items-center gap-2">
          <GlassCircleButton
            size="sm"
            ariaLabel={`Flash Mode: ${flash}`}
            active={flash === 'On'}
            onClick={() => {
              const order: FlashMode[] = ['Auto', 'On', 'Off'];
              const next = order[(order.indexOf(flash) + 1) % order.length];
              setFlash(next);
            }}
          >
            {flash === 'Off' ? (
              <ZapOff className="w-4 h-4 stroke-[1.75] text-white/65" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Zap className="w-4 h-4 stroke-[1.75]" />
                {flash === 'Auto' && (
                  <span className="text-[8px] font-semibold">A</span>
                )}
              </div>
            )}
          </GlassCircleButton>

          {activeMode === 'Night' && (
            <GlassPill
              onClick={() =>
                setNightDurationSec(nightDurationSec === 3 ? 1 : 3)
              }
              ariaLabel="Night Mode Exposure Duration"
            >
              <Moon className="w-3.5 h-3.5 stroke-[1.75]" />
              <span className="font-mono-tabular text-[11px]">
                {nightDurationSec}s
              </span>
            </GlassPill>
          )}
        </div>

        {/* Top Centre: Dynamic Camera Status Indicator / Expandable Control Panel Trigger */}
        <div className="flex items-center">
          {isRecording ? (
            <div className="px-3 py-1 rounded-full bg-[#FF3B30] text-xs font-mono-tabular font-semibold text-white flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>
                00:{String(recordingSeconds).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setControlCenterOpen(!controlCenterOpen);
                setFilterPanelOpen(false);
              }}
              aria-label="Toggle Expandable Camera Control Center"
              aria-expanded={controlCenterOpen}
              className="h-8 px-3 rounded-full liquid-glass-pill flex items-center gap-1.5 text-[11px] font-medium text-white/90 hover:text-white transition-all cursor-pointer"
            >
              <span className="font-mono-tabular">
                {isVideoLikeMode
                  ? `${videoResolution} · ${videoFps}`
                  : `${activeLensSpec.focalLengthMm}mm`}
              </span>
              {!isVideoLikeMode && (
                <>
                  <span aria-hidden="true" className="text-white/30">
                    ·
                  </span>
                  <span className="text-white/80">
                    {rawEnabled ? 'RAW' : hdrEnabled ? 'HDR' : 'JPEG'}
                  </span>
                </>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
                  controlCenterOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Top Right: Photographic Styles + Settings/Scene Controls */}
        <div className="flex items-center gap-2">
          <GlassCircleButton
            size="sm"
            ariaLabel="Toggle Photographic Styles and Filters"
            active={
              filterPanelOpen ||
              selectedFilter !== 'original' ||
              styleTone !== 0 ||
              styleWarmth !== 0
            }
            onClick={() => {
              setFilterPanelOpen(!filterPanelOpen);
              setControlCenterOpen(false);
            }}
          >
            <Sparkles className="w-4 h-4 stroke-[1.75]" />
          </GlassCircleButton>

          <GlassCircleButton
            size="sm"
            ariaLabel="Switch Optical Scene"
            title="Switch Optical Test Scene"
            onClick={() => {
              const ids: OpticalSceneId[] = [
                'alpine_sunset',
                'portrait_studio',
                'tokyo_night',
                'macro_flora',
              ];
              const next =
                ids[(ids.indexOf(activeSceneId) + 1) % ids.length];
              setUseHardwareWebcam(false);
              setActiveSceneId(next);
            }}
          >
            <Layers className="w-4 h-4 stroke-[1.75]" />
          </GlassCircleButton>

          <GlassCircleButton
            size="sm"
            ariaLabel="Open Camera Settings and Hardware Inspector"
            onClick={() => {
              setSettingsInitialTab('settings');
              setSettingsModalOpen(true);
            }}
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[1.75]" />
          </GlassCircleButton>
        </div>
      </header>

      {/* FLOATING IPHONE CAMERA CONTROL PANEL / PHOTOGRAPHIC STYLES */}
      <div className="relative z-30 px-4 mt-1 max-h-[48vh] overflow-y-auto no-scrollbar">
        <ExpandableControlCenter
          open={controlCenterOpen}
          onClose={() => setControlCenterOpen(false)}
          flash={flash}
          onChangeFlash={setFlash}
          hdrEnabled={hdrEnabled}
          onToggleHdr={() => setHdrEnabled(!hdrEnabled)}
          livePhoto={livePhoto}
          onToggleLivePhoto={() => setLivePhoto(!livePhoto)}
          timer={timer}
          onChangeTimer={setTimer}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          ev={ev}
          onChangeEv={setEv}
          rawEnabled={rawEnabled}
          onToggleRaw={() => setRawEnabled(!rawEnabled)}
          gridEnabled={settings.gridEnabled}
          onToggleGrid={() =>
            setSettings((s) => ({ ...s, gridEnabled: !s.gridEnabled }))
          }
          levelEnabled={settings.levelEnabled}
          onToggleLevel={() =>
            setSettings((s) => ({ ...s, levelEnabled: !s.levelEnabled }))
          }
          stabilization={stabilization}
          onToggleStabilization={() => setStabilization(!stabilization)}
          videoResolution={videoResolution}
          onChangeVideoResolution={setVideoResolution}
          videoFps={videoFps}
          onChangeVideoFps={setVideoFps}
          stampEnabled={stamp.enabled}
          onOpenStampStudio={() => {
            setControlCenterOpen(false);
            setStampModalOpen(true);
          }}
          activeSceneId={activeSceneId}
          onSelectScene={(id) => {
            setUseHardwareWebcam(false);
            setActiveSceneId(id);
          }}
          useHardwareWebcam={useHardwareWebcam}
          onToggleWebcam={() => setUseHardwareWebcam(!useHardwareWebcam)}
        />

        <FilterStripPanel
          open={filterPanelOpen}
          selectedFilter={selectedFilter}
          filterIntensity={filterIntensity}
          styleTone={styleTone}
          styleWarmth={styleWarmth}
          onChangeStyleTone={setStyleTone}
          onChangeStyleWarmth={setStyleWarmth}
          onSelectFilter={setSelectedFilter}
          onChangeIntensity={setFilterIntensity}
          onClose={() => setFilterPanelOpen(false)}
        />
      </div>

      {/* BOTTOM AUTHENTIC IPHONE CAMERA DECK */}
      <div className="relative z-30 mt-auto w-full max-w-lg mx-auto px-4 pb-6 pt-3 space-y-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent backdrop-blur-[6px] rounded-t-3xl">
        {/* Portrait & Cinematic Depth Control Slider */}
        {(activeMode === 'Portrait' || activeMode === 'Cinematic') && (
          <div className="max-w-xs mx-auto rounded-full liquid-glass-pill px-4 py-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-white font-mono-tabular font-medium shrink-0">
              <Aperture className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>f/{portraitAperture.toFixed(1)}</span>
            </div>
            <input
              type="range"
              aria-label="Portrait Aperture Depth Control"
              min={1.4}
              max={16}
              step={0.2}
              value={portraitAperture}
              onChange={(e) => setPortraitAperture(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-white cursor-pointer"
            />
          </div>
        )}

        {/* Panorama Guided Capture Strip */}
        {activeMode === 'Panorama' && (
          <div className="max-w-xs mx-auto rounded-2xl liquid-glass px-4 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/90 font-medium">
                Move camera continuously to right
              </span>
              <span className="font-mono-tabular text-white/75">
                {isCapturingPano ? `${panoProgress}%` : 'PANO'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative flex items-center">
              <div className="w-full h-[1px] bg-white/50 absolute" />
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${panoProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Pro Camera Floating Interface */}
        {activeMode === 'Pro' && (
          <ProCameraPanel pro={proControls} onChangePro={setProControls} />
        )}

        {/* Main Section Quick Filter Carousel (Directly accessible in Viewfinder) */}
        {quickFilterOpen && (
          <div className="w-full max-w-md mx-auto py-2 px-2.5 rounded-3xl liquid-glass-heavy space-y-2 animate-fadeIn border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="font-semibold text-white tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Photographic Styles & 108+ Filters</span>
              </span>
              <button
                type="button"
                onClick={() => setQuickFilterOpen(false)}
                className="text-white/60 hover:text-white text-xs px-2 py-0.5 rounded-full bg-white/10 cursor-pointer"
              >
                Done
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {PHOTOGRAPHIC_FILTERS.slice(0, 36).map((f) => {
                const isSelected = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedFilter(f.id);
                    }}
                    aria-label={`Select Filter ${f.name}`}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-center gap-1 p-1 rounded-2xl shrink-0 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white/25 border border-white/60 scale-105 shadow-lg'
                        : 'bg-black/40 border border-white/10 hover:bg-white/15'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden border border-white/25 shadow-inner"
                      style={{
                        background:
                          f.saturation === 0
                            ? 'linear-gradient(135deg,#09090b,#52525b,#f4f4f5)'
                            : f.sepia > 0.35
                              ? 'linear-gradient(135deg,#451a03,#b45309,#fef3c7)'
                              : 'linear-gradient(135deg,#1e3a8a,#c026d3,#f59e0b)',
                        filter: `contrast(${f.contrast}) saturate(${f.saturation}) brightness(${f.brightness}) sepia(${f.sepia}) hue-rotate(${f.hueRotate}deg)`,
                      }}
                    />
                    <span
                      className={`text-[9.5px] max-w-[54px] truncate text-center leading-tight ${
                        isSelected
                          ? 'text-white font-bold'
                          : 'text-white/75 font-medium'
                      }`}
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. AUTHENTIC IPHONE ZOOM SELECTOR (.5 / 1x / 2x / 3x) + MAIN FILTER QUICK TOGGLE */}
        <div className="flex items-center justify-center gap-2.5">
          <ZoomSelector
            zoom={zoom}
            onSelectZoom={setZoom}
            isFrontCamera={isFrontCamera}
          />
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setQuickFilterOpen(!quickFilterOpen);
            }}
            aria-label="Toggle Quick Photographic Filters"
            className={`glass-control w-9 h-9 min-w-[36px] min-h-[36px] ${
              quickFilterOpen || selectedFilter !== 'original' ? 'active' : ''
            }`}
            title="Main Section Filters"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* 4. AUTHENTIC IPHONE HORIZONTAL TEXT MODE SELECTOR */}
        <CameraModeSelector
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
        />

        {/* 3 & 5. AUTHENTIC IPHONE BOTTOM CONTROLS: Gallery Thumbnail (Left) — Shutter (Centre) — Flip (Right) */}
        <div className="flex items-center justify-between px-4 pt-1">
          {/* Left: Circular Latest-Photo Thumbnail */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setGalleryModalOpen(true);
            }}
            aria-label={`Open Gallery (${mediaItems.length} items)`}
            className="relative w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center transition-transform duration-150 active:scale-92 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {latestItem ? (
              <img
                src={latestItem.dataUrl}
                alt="Most recent captured photo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/10" />
            )}
          </button>

          {/* Centre: Authentic iPhone Shutter Button (.camera-shutter) */}
          <button
            type="button"
            onPointerDown={handleShutterPointerDown}
            onPointerUp={handleShutterPointerUp}
            onPointerCancel={handleShutterPointerCancel}
            onClick={(e) => {
              // Avoid duplicate event on devices firing both pointer and click
              if (isQuickTaking) e.preventDefault();
            }}
            aria-label={
              isVideoLikeMode || isQuickTaking
                ? isRecording
                  ? 'Stop Video Recording'
                  : 'Start Video Recording'
                : `Capture ${activeMode} (Press and hold for QuickTake)`
            }
            className={`camera-shutter ${
              isVideoLikeMode || isQuickTaking
                ? isRecording
                  ? 'video-recording'
                  : 'video-standby'
                : ''
            }`}
          >
            <span className="camera-shutter-inner" />
          </button>

          {/* Right: Circular Camera Flip Control (.glass-control) */}
          <button
            type="button"
            aria-label={
              isFrontCamera
                ? 'Switch to Rear Triple Camera'
                : 'Switch to Front TrueDepth Camera'
            }
            onClick={() => {
              triggerHaptic(10);
              setFlipRotationDeg((d) => d + 180);
              setIsFrontCamera(!isFrontCamera);
              setZoom(1.0);
            }}
            className="glass-control w-12 h-12 min-w-[48px] min-h-[48px]"
          >
            <RefreshCw
              style={{ transform: `rotate(${flipRotationDeg}deg)` }}
              className="w-5 h-5 stroke-[1.75] transition-transform duration-300 text-white"
            />
          </button>
        </div>
      </div>

      {/* MODALS: Stamp Studio, Apple Photos Gallery, iOS Photos Editor, and Settings/Hardware */}
      <StampStudioModal
        open={stampModalOpen}
        onClose={() => setStampModalOpen(false)}
        stamp={stamp}
        onChangeStamp={setStamp}
      />

      <GalleryModal
        open={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
        items={mediaItems}
        onToggleFavorite={(id) =>
          setMediaItems((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, favorite: !it.favorite } : it
            )
          )
        }
        onDeleteItem={(id) =>
          setMediaItems((prev) => prev.filter((it) => it.id !== id))
        }
        onEditItem={(item) => {
          setGalleryModalOpen(false);
          setEditingItem(item);
        }}
      />

      <PhotoVideoEditorModal
        item={editingItem}
        stamp={stamp}
        onClose={() => setEditingItem(null)}
        onOpenStampStudio={() => setStampModalOpen(true)}
        onSaveEditedItem={(updated, asNewCopy) => {
          if (asNewCopy) {
            setMediaItems((prev) => [updated, ...prev]);
          } else {
            setMediaItems((prev) =>
              prev.map((it) => (it.id === updated.id ? updated : it))
            );
          }
          setEditingItem(null);
        }}
      />

      <SettingsAndHardwareModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onChangeSettings={setSettings}
        hardware={hardware}
        initialTab={settingsInitialTab}
        onOpenStampStudio={() => {
          setSettingsModalOpen(false);
          setStampModalOpen(true);
        }}
      />
    </main>
  );
}
