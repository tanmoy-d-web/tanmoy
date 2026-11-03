import React, { useState } from 'react';
import {
  Cpu,
  Sliders,
  Code2,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  HardDrive,
  ChevronRight,
  Camera,
  Video,
  Grid,
  Volume2,
  Lock,
  Layers,
  Smartphone,
  Info,
  Download,
  Share2,
} from 'lucide-react';
import {
  PHOTOGRAPHIC_FILTERS,
  PHOTOGRAPHIC_STYLES,
  type CameraMode,
  type FilterId,
  type FlashMode,
  type TimerSeconds,
  type VideoFps,
  type VideoResolution,
} from '../engine/cameraEngine';
import { GlassBottomSheet, GlassButton, GlassToggle, triggerHaptic } from './GlassUI';

export interface AppSettingsState {
  photoQuality: 'High Efficiency (HEIF)' | 'Most Compatible (JPEG)' | 'Apple ProRAW 48MP (DNG)';
  videoResolution: VideoResolution;
  videoFps: VideoFps;
  defaultLens: '0.5x Ultra Wide' | '1x Main 24mm' | '2x Optical 48mm' | '3x Telephoto 77mm';
  defaultMode: CameraMode;
  gridEnabled: boolean;
  levelEnabled: boolean;
  timer: TimerSeconds;
  flash: FlashMode;
  hdrEnabled: boolean;
  defaultFilter: FilterId;
  hapticsEnabled: boolean;
  shutterSoundEnabled: boolean;
  saveLocationTag: boolean;
  storagePath: string;
  // Authentic iOS Camera Settings extensions
  proRawResolution?: '48MP' | '12MP';
  proResEnabled?: boolean;
  proResFormat?: 'ProRes 4K 60fps Log' | 'ProRes 4K 30fps HDR' | 'ProRes 1080p 60fps';
  sloMoFps?: '120 fps' | '240 fps';
  cinematicResolution?: '4K at 30 fps' | '4K at 24 fps' | '1080p at 30 fps';
  mirrorFrontCamera?: boolean;
  viewOutsideFrame?: boolean;
  enhancedStabilization?: boolean;
  actionLowerLight?: boolean;
  stereoAudio?: boolean;
  windNoiseReduction?: boolean;
  preserveCameraMode?: boolean;
  preserveCreativeControls?: boolean;
  preserveMacroControl?: boolean;
  preserveExposure?: boolean;
  preserveNightMode?: boolean;
  fasterShooting?: boolean;
  lensCorrection?: boolean;
  macroControl?: boolean;
}

export interface DetectedHardwareCapabilities {
  cameraDevicesCount: number;
  deviceLabels: string[];
  hasFrontLens: boolean;
  hasRearLens: boolean;
  supportedFocalLengths: string[];
  zoomRange: string;
  torchFlashSupported: boolean;
  continuousAfSupported: boolean;
  isoRange: string;
  shutterRange: string;
  rawDngSupported: boolean;
  maxResolution: string;
  supportedFps: string;
  oisStabilization: boolean;
  camera2HardwareLevel: string;
}

export interface SettingsAndHardwareModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettingsState;
  onChangeSettings: (next: AppSettingsState) => void;
  hardware: DetectedHardwareCapabilities;
  onOpenStampStudio: () => void;
  initialTab?: 'settings' | 'hardware' | 'kotlin';
}

const KOTLIN_MODULES: {
  id: string;
  filename: string;
  moduleName: string;
  code: string;
}[] = [
  {
    id: 'glass_ui',
    filename: 'ui/glass/LiquidGlassComponents.kt',
    moduleName: '3. Glass UI Components',
    code: `package com.icampro.camera.ui.glass

import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun Modifier.liquidGlassSurface(
    cornerRadius: Dp = 24.dp,
    isActive: Boolean = false
): Modifier {
    val shape = RoundedCornerShape(cornerRadius)
    val borderBrush = Brush.verticalGradient(
        colors = if (isActive) {
            listOf(Color.White.copy(alpha = 0.5f), Color.White.copy(alpha = 0.25f))
        } else {
            listOf(Color.White.copy(alpha = 0.22f), Color.White.copy(alpha = 0.08f))
        }
    )
    val surfaceBrush = Brush.verticalGradient(
        colors = if (isActive) {
            listOf(Color(0x40FFFFFF), Color(0x1AFFFFFF))
        } else {
            listOf(Color(0x802C2C2E), Color(0xAA1C1C1E))
        }
    )
    return this
        .clip(shape)
        .background(surfaceBrush, shape)
        .border(BorderStroke(1.dp, borderBrush), shape)
}

@Composable
fun GlassCircleButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
    isActive: Boolean = false,
    content: @Composable BoxScope.() -> Unit
) {
    val haptics = LocalHapticFeedback.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.92f else 1f, label = "pressScale")

    Box(
        modifier = modifier
            .size(size)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .liquidGlassSurface(cornerRadius = size / 2, isActive = isActive)
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) {
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            },
        contentAlignment = Alignment.Center,
        content = content
    )
}`,
  },
  {
    id: 'camera_engine',
    filename: 'engine/CameraController.kt',
    moduleName: '1. CameraX & Camera2 Interop Engine',
    code: `package com.icampro.camera.engine

import android.content.ContentValues
import android.content.Context
import android.hardware.camera2.CaptureRequest
import android.os.Build
import android.provider.MediaStore
import android.util.Range
import androidx.annotation.OptIn
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@OptIn(ExperimentalCamera2Interop::class)
class CameraController(private val context: Context) {
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var videoCapture: VideoCapture<Recorder>? = null

    private val _zoomRatio = MutableStateFlow(1.0f)
    val zoomRatio: StateFlow<Float> = _zoomRatio

    fun bindCamera(
        lifecycleOwner: LifecycleOwner,
        surfaceProvider: Preview.SurfaceProvider,
        lensFacing: Int = CameraSelector.LENS_FACING_BACK
    ) {
        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener({
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(surfaceProvider)
            }
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            val recorder = Recorder.Builder()
                .setQualitySelector(QualitySelector.from(Quality.UHD))
                .build()
            videoCapture = VideoCapture.withOutput(recorder)

            val selector = CameraSelector.Builder()
                .requireLensFacing(lensFacing)
                .build()

            provider.unbindAll()
            camera = provider.bindToLifecycle(
                lifecycleOwner,
                selector,
                preview,
                imageCapture,
                videoCapture
            )
        }, ContextCompat.getMainExecutor(context))
    }

    fun applyProManualParameters(
        iso: Int?,
        exposureTimeNs: Long?,
        focusDistanceDiopters: Float?
    ) {
        val camControl = camera?.cameraControl ?: return
        val interop = Camera2CameraControl.from(camControl)
        val builder = CaptureRequestOptions.Builder()

        if (iso != null || exposureTimeNs != null) {
            builder.setCaptureRequestOption(
                CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_OFF
            )
            iso?.let {
                builder.setCaptureRequestOption(CaptureRequest.SENSOR_SENSITIVITY, it)
            }
            exposureTimeNs?.let {
                builder.setCaptureRequestOption(CaptureRequest.SENSOR_EXPOSURE_TIME, it)
            }
        } else {
            builder.setCaptureRequestOption(
                CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_ON
            )
        }

        if (focusDistanceDiopters != null) {
            builder.setCaptureRequestOption(
                CaptureRequest.CONTROL_AF_MODE,
                CaptureRequest.CONTROL_AF_MODE_OFF
            )
            builder.setCaptureRequestOption(
                CaptureRequest.LENS_FOCUS_DISTANCE,
                focusDistanceDiopters
            )
        }
        interop.captureRequestOptions = builder.build()
    }
}`,
  },
];

export const SettingsAndHardwareModal: React.FC<SettingsAndHardwareModalProps> = ({
  open,
  onClose,
  settings,
  onChangeSettings,
  hardware,
  onOpenStampStudio,
  initialTab = 'settings',
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'hardware' | 'kotlin'>(initialTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [installPromptShown, setInstallPromptShown] = useState(false);

  const handleCopyCode = (id: string, code: string) => {
    triggerHaptic(8);
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInstallPwa = () => {
    triggerHaptic(10);
    setInstallPromptShown(true);
    setTimeout(() => setInstallPromptShown(false), 3500);
  };

  return (
    <GlassBottomSheet
      open={open}
      onClose={onClose}
      title="Settings"
      maxHeight="max-h-[88vh]"
    >
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/45 border border-white/12 mb-4">
        {[
          { id: 'settings', label: 'Camera Settings', icon: Sliders },
          { id: 'hardware', label: 'Camera2 Hardware', icon: Cpu },
          { id: 'kotlin', label: 'Kotlin Modules', icon: Code2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6 pb-6 text-white text-xs">
          {/* SECTION 1: FORMATS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Formats
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl divide-y divide-white/10 overflow-hidden">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">Camera Capture</span>
                  <span className="text-white/60 text-[11px]">
                    HEIF/HEVC vs JPEG/H.264 compatibility
                  </span>
                </div>
                <select
                  value={settings.photoQuality}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      photoQuality: e.target.value as any,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                >
                  <option value="High Efficiency (HEIF)">High Efficiency (HEIF)</option>
                  <option value="Most Compatible (JPEG)">Most Compatible (JPEG)</option>
                  <option value="Apple ProRAW 48MP (DNG)">Apple ProRAW 48MP (DNG)</option>
                </select>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">ProRAW & Resolution</span>
                  <span className="text-white/60 text-[11px]">
                    12-bit Linear DNG sensor readout
                  </span>
                </div>
                <select
                  value={settings.proRawResolution || '48MP'}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      proRawResolution: e.target.value as any,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                >
                  <option value="48MP">ProRAW Max (48 MP)</option>
                  <option value="12MP">ProRAW (12 MP)</option>
                </select>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">Apple ProRes Video</span>
                  <span className="text-white/60 text-[11px]">
                    Broadcast-quality 10-bit Log color profile
                  </span>
                </div>
                <select
                  value={settings.proResFormat || 'ProRes 4K 60fps Log'}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      proResFormat: e.target.value as any,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                >
                  <option value="ProRes 4K 60fps Log">ProRes 4K 60fps (Log)</option>
                  <option value="ProRes 4K 30fps HDR">ProRes 4K 30fps (HDR)</option>
                  <option value="ProRes 1080p 60fps">ProRes 1080p 60fps</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-white/45 px-3">
              To reduce file sizes, capture in High Efficiency format. Apple ProRAW retains complete
              computational dynamic range without baked-in compression.
            </p>
          </div>

          {/* SECTION 2: RECORD VIDEO */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Record Video
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl divide-y divide-white/10 overflow-hidden">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">Video Resolution & Frame Rate</span>
                  <span className="text-white/60 text-[11px]">Main camera recording format</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={settings.videoResolution}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        videoResolution: e.target.value as any,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                  >
                    <option value="4K">4K UHD</option>
                    <option value="1080p">1080p HD</option>
                    <option value="720p">720p HD</option>
                  </select>
                  <select
                    value={settings.videoFps}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        videoFps: Number(e.target.value) as any,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                  >
                    <option value="60">60 fps (Action)</option>
                    <option value="30">30 fps (Standard)</option>
                    <option value="24">24 fps (Film)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">Record Slo-mo</span>
                  <span className="text-white/60 text-[11px]">High-speed computational sensor readout</span>
                </div>
                <select
                  value={settings.sloMoFps || '240 fps'}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      sloMoFps: e.target.value as any,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                >
                  <option value="240 fps">1080p at 240 fps (Super Slo-mo)</option>
                  <option value="120 fps">1080p at 120 fps</option>
                </select>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-white block">Record Cinematic</span>
                  <span className="text-white/60 text-[11px]">Computational rack-focus depth of field</span>
                </div>
                <select
                  value={settings.cinematicResolution || '4K at 30 fps'}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      cinematicResolution: e.target.value as any,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white cursor-pointer"
                >
                  <option value="4K at 30 fps">4K at 30 fps</option>
                  <option value="4K at 24 fps">4K at 24 fps (Film)</option>
                  <option value="1080p at 30 fps">1080p at 30 fps</option>
                </select>
              </div>

              <GlassToggle
                label="Enhanced Video Stabilization"
                description="Sensor-shift OIS combined with real-time electronic horizon lock"
                checked={settings.enhancedStabilization !== false}
                onChange={(enhancedStabilization) =>
                  onChangeSettings({ ...settings, enhancedStabilization })
                }
              />
              <GlassToggle
                label="Action Mode Lower Light"
                description="Optimize shutter exposure when recording high-movement scenes in dim light"
                checked={Boolean(settings.actionLowerLight)}
                onChange={(actionLowerLight) =>
                  onChangeSettings({ ...settings, actionLowerLight })
                }
              />
              <GlassToggle
                label="10-bit Dolby Vision HDR Video"
                description="Capture billions of colors with enhanced dynamic range"
                checked={settings.hdrEnabled}
                onChange={(hdrEnabled) =>
                  onChangeSettings({ ...settings, hdrEnabled })
                }
              />
            </div>
          </div>

          {/* SECTION 3: COMPOSITION & OPTICS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Composition & Optics
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl divide-y divide-white/10 overflow-hidden">
              <GlassToggle
                label="Grid (Rule of Thirds)"
                description="Display precision 3×3 framing grid lines on viewfinder"
                checked={settings.gridEnabled}
                onChange={(gridEnabled) =>
                  onChangeSettings({ ...settings, gridEnabled })
                }
              />
              <GlassToggle
                label="Level"
                description="Real-time horizon reticle showing pitch and roll angles"
                checked={settings.levelEnabled}
                onChange={(levelEnabled) =>
                  onChangeSettings({ ...settings, levelEnabled })
                }
              />
              <GlassToggle
                label="Mirror Front Camera"
                description="Save selfies matching the preview reflection"
                checked={Boolean(settings.mirrorFrontCamera)}
                onChange={(mirrorFrontCamera) =>
                  onChangeSettings({ ...settings, mirrorFrontCamera })
                }
              />
              <GlassToggle
                label="View Outside the Frame"
                description="Use Ultra-Wide sensor to preview content outside the active lens crop"
                checked={settings.viewOutsideFrame !== false}
                onChange={(viewOutsideFrame) =>
                  onChangeSettings({ ...settings, viewOutsideFrame })
                }
              />
            </div>
          </div>

          {/* SECTION 4: PRESERVE SETTINGS */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Preserve Settings
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl divide-y divide-white/10 overflow-hidden">
              <GlassToggle
                label="Camera Mode"
                description="Preserve the last used mode, such as Video or Portrait, rather than resetting to Photo"
                checked={Boolean(settings.preserveCameraMode)}
                onChange={(preserveCameraMode) =>
                  onChangeSettings({ ...settings, preserveCameraMode })
                }
              />
              <GlassToggle
                label="Creative Controls"
                description="Preserve last used filter, aspect ratio, or lighting effect"
                checked={Boolean(settings.preserveCreativeControls)}
                onChange={(preserveCreativeControls) =>
                  onChangeSettings({ ...settings, preserveCreativeControls })
                }
              />
              <GlassToggle
                label="Exposure Adjustment"
                description="Preserve exposure indicator and dial offset across app restarts"
                checked={Boolean(settings.preserveExposure)}
                onChange={(preserveExposure) =>
                  onChangeSettings({ ...settings, preserveExposure })
                }
              />
              <GlassToggle
                label="Night Mode"
                description="Preserve Night Mode setting rather than automatically resetting to Auto"
                checked={Boolean(settings.preserveNightMode)}
                onChange={(preserveNightMode) =>
                  onChangeSettings({ ...settings, preserveNightMode })
                }
              />
            </div>
          </div>

          {/* SECTION 5: PHOTO CAPTURE & AUDIO */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Photo Capture & Audio
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl divide-y divide-white/10 overflow-hidden">
              <GlassToggle
                label="Prioritize Faster Shooting"
                description="Adapt image processing when rapidly tapping the shutter"
                checked={Boolean(settings.fasterShooting)}
                onChange={(fasterShooting) =>
                  onChangeSettings({ ...settings, fasterShooting })
                }
              />
              <GlassToggle
                label="Lens Correction"
                description="Correct geometric barrel distortion on ultra-wide and selfie lenses"
                checked={settings.lensCorrection !== false}
                onChange={(lensCorrection) =>
                  onChangeSettings({ ...settings, lensCorrection })
                }
              />
              <GlassToggle
                label="Macro Control"
                description="Automatically switch to ultra-wide lens when close to subjects"
                checked={settings.macroControl !== false}
                onChange={(macroControl) =>
                  onChangeSettings({ ...settings, macroControl })
                }
              />
              <GlassToggle
                label="Stereo Audio & Audio Zoom"
                description="Directional microphone array tracking zoom focal point"
                checked={settings.stereoAudio !== false}
                onChange={(stereoAudio) =>
                  onChangeSettings({ ...settings, stereoAudio })
                }
              />
              <GlassToggle
                label="Acoustic Shutter Click"
                description="Synthesize mechanical leaf-shutter click on capture"
                checked={settings.shutterSoundEnabled}
                onChange={(shutterSoundEnabled) =>
                  onChangeSettings({ ...settings, shutterSoundEnabled })
                }
              />
              <GlassToggle
                label="Taptic Haptic Feedback"
                description="Micro-vibrations on shutter release, mode dials, and zoom detents"
                checked={settings.hapticsEnabled}
                onChange={(hapticsEnabled) =>
                  onChangeSettings({ ...settings, hapticsEnabled })
                }
              />
            </div>
          </div>

          {/* SECTION 6: ANDROID APP & STORAGE */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 px-3">
              Android Application & Storage
            </span>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Install iCam Pro PWA / Android APK</span>
                  <span className="text-white/60 text-[11px]">
                    Install directly to your Android device home screen
                  </span>
                </div>
                <GlassButton onClick={handleInstallPwa} ariaLabel="Install Android Application">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </GlassButton>
              </div>

              {installPromptShown && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-[11px] text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                  <span>
                    Tap your browser menu (⋮) and select "Add to Home screen" or "Install App" to run iCam Pro full-screen as a native Android app!
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10">
                <label
                  htmlFor="setting-storage-path"
                  className="block text-[11px] text-white/70 mb-1"
                >
                  Android MediaStore Output Directory
                </label>
                <input
                  id="setting-storage-path"
                  type="text"
                  value={settings.storagePath}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      storagePath: e.target.value,
                    })
                  }
                  className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/20 text-xs text-white font-mono-tabular"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-white/70">Custom Metadata Watermark</span>
                <GlassButton onClick={onOpenStampStudio} ariaLabel="Customize Watermark">
                  <span>Open Stamp Studio</span>
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hardware' && (
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl bg-white/[0.06] border border-white/15 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl liquid-glass-active flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  DeviceCapabilityManager Diagnostic
                </h3>
                <p className="text-xs text-white/60">
                  Hardware Level: {hardware.camera2HardwareLevel} · {hardware.cameraDevicesCount} Optical Sensors
                </p>
              </div>
            </div>
            <span className="text-xs font-mono-tabular text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-400/30">
              Verified Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              {
                label: 'Detected Lenses',
                val: hardware.deviceLabels.join(', ') || '13mm, 24mm, 48mm, 77mm',
              },
              {
                label: '35mm Equivalent Focal Lengths',
                val: hardware.supportedFocalLengths.join(' · '),
              },
              { label: 'Optical / Digital Zoom Range', val: hardware.zoomRange },
              {
                label: 'ISO Sensitivity Range',
                val: hardware.isoRange,
              },
              {
                label: 'Electronic Shutter Speed Range',
                val: hardware.shutterRange,
              },
              {
                label: 'Apple ProRAW / DNG Sensor Readout',
                val: hardware.rawDngSupported ? 'Supported (12-bit Linear DNG)' : 'Software Pipeline',
              },
              {
                label: 'Video Resolution & High Frame Rate',
                val: `${hardware.maxResolution} · ${hardware.supportedFps}`,
              },
              {
                label: 'Sensor-Shift OIS & Autofocus',
                val: `${hardware.oisStabilization ? 'OIS + EIS Active' : 'EIS'} · ${
                  hardware.continuousAfSupported ? 'Dual-Pixel AF-C' : 'Contrast AF'
                }`,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 flex flex-col gap-1"
              >
                <span className="text-white/50">{row.label}</span>
                <span className="font-mono-tabular font-semibold text-white">
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'kotlin' && (
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 flex items-center justify-between gap-2 text-xs text-white/80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white shrink-0" />
              <span>
                Native Android Kotlin + Jetpack Compose + CameraX / Camera2 Interop modules are available in this application.
              </span>
            </div>
          </div>

          {KOTLIN_MODULES.map((mod) => (
            <div
              key={mod.id}
              className="rounded-2xl bg-black/60 border border-white/15 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {mod.moduleName}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-white/60">
                    android/app/src/main/java/com/icampro/camera/{mod.filename}
                  </span>
                </div>
                <GlassButton
                  onClick={() => handleCopyCode(mod.id, mod.code)}
                  ariaLabel={`Copy ${mod.filename}`}
                >
                  {copiedId === mod.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Kotlin</span>
                    </>
                  )}
                </GlassButton>
              </div>
              <pre className="p-4 text-[11px] font-mono-tabular text-slate-200 overflow-x-auto max-h-60">
                <code>{mod.code}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </GlassBottomSheet>
  );
};
