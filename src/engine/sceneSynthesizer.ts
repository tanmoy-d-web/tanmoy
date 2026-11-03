/**
 * Live Computational Viewfinder Scene Synthesizer & Non-Destructive Image Processor
 * Renders 4 realistic, dynamic photographic scenes (Portrait Studio, Dolomites Sunset,
 * Tokyo Rain Night, Botanical Macro) when hardware webcam is unavailable or switched,
 * and bakes filters, adjustments, Portrait depth blur, and Photo Stamps into full-resolution captures.
 */

import {
  buildCssFilterString,
  formatStampPayload,
  PHOTOGRAPHIC_FILTERS,
  type AspectRatioOption,
  type CameraMode,
  type FilterId,
  type PhotoAdjustments,
  type StampSettings,
} from './cameraEngine';

export type OpticalSceneId = 'portrait_studio' | 'alpine_sunset' | 'tokyo_night' | 'macro_flora';

export interface OpticalSceneMeta {
  id: OpticalSceneId;
  name: string;
  subtitle: string;
  recommendedMode: CameraMode;
  ambientLux: number;
}

export const OPTICAL_SCENES: OpticalSceneMeta[] = [
  {
    id: 'alpine_sunset',
    name: 'Dolomites Alpenglow',
    subtitle: '24mm Wide · High Dynamic Range',
    recommendedMode: 'Photo',
    ambientLux: 1450,
  },
  {
    id: 'portrait_studio',
    name: 'Milan Portrait Studio',
    subtitle: '48mm / 77mm · Subject Depth Map',
    recommendedMode: 'Portrait',
    ambientLux: 680,
  },
  {
    id: 'tokyo_night',
    name: 'Shinjuku Rain Neon',
    subtitle: 'Low-Light 18 Lux · Multi-Frame Night',
    recommendedMode: 'Night',
    ambientLux: 18,
  },
  {
    id: 'macro_flora',
    name: 'Botanical Dewdrop',
    subtitle: '13mm Ultra-Wide Macro · 2cm Focus',
    recommendedMode: 'Pro',
    ambientLux: 920,
  },
];

export interface SceneRenderOptions {
  sceneId: OpticalSceneId;
  timeSec: number;
  zoom: number;
  isFrontCamera: boolean;
  portraitBlurAperture: number; // f/1.4 (heavy blur) .. f/16 (sharp)
  isPortraitMode: boolean;
  isNightMode: boolean;
  manualFocus: 'Auto' | number;
  focusPoint: { x: number; y: number }; // 0..1
}

/**
 * Draws a rich procedural photographic scene onto a 2D canvas context
 */
export function drawOpticalScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: SceneRenderOptions
): void {
  ctx.save();

  // Apply optical zoom and front-camera mirror
  const effectiveZoom = Math.max(1, opts.zoom >= 1 ? 1 + (opts.zoom - 1) * 0.45 : 0.88 + opts.zoom * 0.24);
  const cx = width * opts.focusPoint.x;
  const cy = height * opts.focusPoint.y;

  ctx.translate(width / 2, height / 2);
  if (opts.isFrontCamera) {
    ctx.scale(-effectiveZoom, effectiveZoom);
  } else {
    ctx.scale(effectiveZoom, effectiveZoom);
  }
  ctx.translate(-width / 2 + (width / 2 - cx) * 0.12, -height / 2 + (height / 2 - cy) * 0.12);

  // Compute background bokeh blur radius for Portrait Mode or Manual Focus
  const portraitBlurPx = opts.isPortraitMode
    ? Math.max(0, (16 - opts.portraitBlurAperture) * 0.85)
    : opts.manualFocus !== 'Auto'
      ? Math.abs(opts.manualFocus - 0.5) * 14
      : 0;

  if (opts.sceneId === 'alpine_sunset') {
    drawAlpineSunsetScene(ctx, width, height, opts.timeSec, portraitBlurPx);
  } else if (opts.sceneId === 'portrait_studio') {
    drawPortraitStudioScene(ctx, width, height, opts.timeSec, portraitBlurPx);
  } else if (opts.sceneId === 'tokyo_night') {
    drawTokyoNightScene(ctx, width, height, opts.timeSec, portraitBlurPx, opts.isNightMode);
  } else {
    drawMacroFloraScene(ctx, width, height, opts.timeSec, portraitBlurPx);
  }

  ctx.restore();
}

function drawAlpineSunsetScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  bgBlurPx: number
) {
  ctx.save();
  if (bgBlurPx > 0.5) {
    ctx.filter = `blur(${(bgBlurPx * 0.5).toFixed(1)}px)`;
  }

  // Golden hour atmospheric sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  skyGrad.addColorStop(0, '#0f172a');
  skyGrad.addColorStop(0.28, '#1e293b');
  skyGrad.addColorStop(0.58, '#7c2d12');
  skyGrad.addColorStop(0.82, '#ea580c');
  skyGrad.addColorStop(1, '#fde047');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.65);

  // Warm sun orb with soft atmospheric halo
  const sunX = w * 0.68 + Math.sin(t * 0.15) * 8;
  const sunY = h * 0.34;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.38);
  sunGlow.addColorStop(0, 'rgba(255, 251, 235, 0.96)');
  sunGlow.addColorStop(0.18, 'rgba(253, 224, 71, 0.68)');
  sunGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.25)');
  sunGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, w, h * 0.7);

  // Distant Dolomite jagged peaks
  ctx.beginPath();
  ctx.moveTo(0, h * 0.58);
  ctx.lineTo(w * 0.12, h * 0.42);
  ctx.lineTo(w * 0.22, h * 0.47);
  ctx.lineTo(w * 0.36, h * 0.27);
  ctx.lineTo(w * 0.48, h * 0.39);
  ctx.lineTo(w * 0.61, h * 0.24);
  ctx.lineTo(w * 0.76, h * 0.36);
  ctx.lineTo(w * 0.89, h * 0.29);
  ctx.lineTo(w, h * 0.45);
  ctx.lineTo(w, h * 0.64);
  ctx.closePath();
  const peakGrad = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.62);
  peakGrad.addColorStop(0, '#fb923c');
  peakGrad.addColorStop(0.35, '#9a3412');
  peakGrad.addColorStop(0.75, '#312e81');
  peakGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = peakGrad;
  ctx.fill();

  // sunlit ridge facet highlights
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.27);
  ctx.lineTo(w * 0.41, h * 0.46);
  ctx.lineTo(w * 0.31, h * 0.49);
  ctx.closePath();
  ctx.fillStyle = 'rgba(253, 186, 116, 0.34)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.61, h * 0.24);
  ctx.lineTo(w * 0.67, h * 0.45);
  ctx.lineTo(w * 0.56, h * 0.47);
  ctx.closePath();
  ctx.fillStyle = 'rgba(254, 215, 170, 0.38)';
  ctx.fill();

  ctx.restore();

  // Foreground glacial lake with dynamic water ripples (sharp foreground)
  const lakeGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
  lakeGrad.addColorStop(0, '#431407');
  lakeGrad.addColorStop(0.25, '#1e3a8a');
  lakeGrad.addColorStop(0.65, '#0f172a');
  lakeGrad.addColorStop(1, '#020617');
  ctx.fillStyle = lakeGrad;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // Shimmering water reflection bands
  for (let i = 0; i < 18; i++) {
    const py = h * 0.6 + (i / 18) * (h * 0.36);
    const waveOffset = Math.sin(t * 1.8 + i * 0.7) * (8 + i * 0.8);
    const rw = w * (0.14 + (i / 18) * 0.22);
    ctx.fillStyle = `rgba(251, 146, 60, ${(0.36 - i * 0.015).toFixed(3)})`;
    ctx.fillRect(sunX - rw / 2 + waveOffset, py, rw, 2.5 + i * 0.2);
  }

  // Foreground alpine pine silhouettes
  ctx.fillStyle = '#090d16';
  for (let i = 0; i < 7; i++) {
    const tx = w * (0.04 + i * 0.055);
    const baseH = h * (0.62 + (i % 2) * 0.02);
    const treeH = h * (0.12 + (i % 3) * 0.035);
    ctx.beginPath();
    ctx.moveTo(tx, baseH - treeH);
    ctx.lineTo(tx - 16, baseH);
    ctx.lineTo(tx + 16, baseH);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPortraitStudioScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  bgBlurPx: number
) {
  // Background architectural sunlit studio with controllable Portrait bokeh blur
  ctx.save();
  const effectiveBlur = Math.max(2, bgBlurPx);
  ctx.filter = `blur(${effectiveBlur.toFixed(1)}px)`;

  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#1c1917');
  bgGrad.addColorStop(0.45, '#44403c');
  bgGrad.addColorStop(0.8, '#78350f');
  bgGrad.addColorStop(1, '#1c1917');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Warm window light shafts & creamy optical bokeh circles in background
  const bokehSpots = [
    { x: 0.18, y: 0.22, r: 0.09, c: 'rgba(254, 240, 138, 0.35)' },
    { x: 0.82, y: 0.18, r: 0.11, c: 'rgba(251, 191, 36, 0.32)' },
    { x: 0.76, y: 0.42, r: 0.08, c: 'rgba(253, 186, 116, 0.28)' },
    { x: 0.22, y: 0.48, r: 0.07, c: 'rgba(254, 215, 170, 0.26)' },
    { x: 0.88, y: 0.68, r: 0.1, c: 'rgba(245, 158, 11, 0.22)' },
  ];
  for (let i = 0; i < bokehSpots.length; i++) {
    const b = bokehSpots[i];
    const bx = w * b.x + Math.sin(t * 0.6 + i) * 6;
    const by = h * b.y + Math.cos(t * 0.5 + i) * 6;
    ctx.beginPath();
    ctx.arc(bx, by, w * b.r * (1 + effectiveBlur * 0.03), 0, Math.PI * 2);
    ctx.fillStyle = b.c;
    ctx.fill();
  }
  ctx.restore();

  // Sharp foreground Portrait Subject (Editorial rim-lit chiaroscuro portrait)
  const cx = w * 0.5;
  const cy = h * 0.48 + Math.sin(t * 1.1) * 2.0;
  const scale = Math.min(w, h) / 420;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Warm golden key-light halo behind subject
  const rimGrad = ctx.createRadialGradient(24, -40, 16, 0, -15, 175);
  rimGrad.addColorStop(0, 'rgba(253, 224, 71, 0.62)');
  rimGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.22)');
  rimGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(0, -15, 175, 0, Math.PI * 2);
  ctx.fill();

  // Flowing dark hair volume with warm rim highlight
  ctx.fillStyle = '#140f0d';
  ctx.beginPath();
  ctx.ellipse(0, -28, 72, 92, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tailored charcoal & warm taupe editorial coat shoulders
  const coatGrad = ctx.createLinearGradient(-130, 70, 130, 240);
  coatGrad.addColorStop(0, '#292524');
  coatGrad.addColorStop(0.55, '#1c1917');
  coatGrad.addColorStop(1, '#0c0a09');
  ctx.fillStyle = coatGrad;
  ctx.beginPath();
  ctx.moveTo(-135, 240);
  ctx.quadraticCurveTo(-120, 88, -44, 74);
  ctx.lineTo(44, 74);
  ctx.quadraticCurveTo(120, 88, 135, 240);
  ctx.closePath();
  ctx.fill();

  // Warm golden rim-light edge along right shoulder
  ctx.strokeStyle = 'rgba(253, 186, 116, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(44, 74);
  ctx.quadraticCurveTo(118, 88, 133, 235);
  ctx.stroke();

  // Cream silk turtleneck collar
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.roundRect(-25, 58, 50, 32, 8);
  ctx.fill();

  // Neck with Rembrandt shadow gradient
  const neckGrad = ctx.createLinearGradient(-22, 24, 24, 70);
  neckGrad.addColorStop(0, '#eab696');
  neckGrad.addColorStop(1, '#9a5b3e');
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.roundRect(-20, 26, 40, 44, 14);
  ctx.fill();

  // Sculpted face with editorial side key light & natural shadow side
  const faceGrad = ctx.createLinearGradient(-48, -45, 48, -15);
  faceGrad.addColorStop(0, '#f7cdb2');
  faceGrad.addColorStop(0.52, '#dfa382');
  faceGrad.addColorStop(1, '#8c4f36');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(0, -34, 48, 62, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft cheek highlight (Rembrandt triangle)
  const cheekGlow = ctx.createRadialGradient(-20, -24, 2, -20, -24, 22);
  cheekGlow.addColorStop(0, 'rgba(255, 237, 213, 0.55)');
  cheekGlow.addColorStop(1, 'rgba(255, 237, 213, 0)');
  ctx.fillStyle = cheekGlow;
  ctx.beginPath();
  ctx.arc(-20, -24, 22, 0, Math.PI * 2);
  ctx.fill();

  // Swept front hair locks
  ctx.fillStyle = '#18110f';
  ctx.beginPath();
  ctx.moveTo(-50, -40);
  ctx.quadraticCurveTo(-46, -102, 4, -98);
  ctx.quadraticCurveTo(54, -94, 50, -28);
  ctx.quadraticCurveTo(28, -68, -10, -76);
  ctx.quadraticCurveTo(-36, -70, -50, -40);
  ctx.closePath();
  ctx.fill();

  // Expressive eyes with dual catchlights
  const drawEye = (ex: number, ey: number) => {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 9.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warm hazel iris
    ctx.fillStyle = '#5c2808';
    ctx.beginPath();
    ctx.arc(ex, ey, 4.4, 0, Math.PI * 2);
    ctx.fill();

    // Deep pupil
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Key light catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 1.6, ey - 1.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  };
  drawEye(-18, -36);
  drawEye(18, -36);

  // Upper lash line & sculpted brows
  ctx.strokeStyle = '#1c120e';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-29, -46);
  ctx.quadraticCurveTo(-18, -51, -7, -46);
  ctx.moveTo(7, -46);
  ctx.quadraticCurveTo(18, -51, 29, -46);
  ctx.stroke();

  // Subtle nose bridge and natural warm rose lips
  ctx.strokeStyle = 'rgba(115, 62, 42, 0.55)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-1, -34);
  ctx.lineTo(-3, -13);
  ctx.lineTo(4, -11);
  ctx.stroke();

  ctx.fillStyle = '#b85d56';
  ctx.beginPath();
  ctx.ellipse(0, 4, 12.5, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTokyoNightScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  bgBlurPx: number,
  isNightMode: boolean
) {
  // Deep night sky & wet Shinjuku alleyway
  const nightBoost = isNightMode ? 1.25 : 1.0;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#030712');
  bg.addColorStop(0.55, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Perspective buildings
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, w * 0.26, h * 0.68);
  ctx.fillRect(w * 0.74, 0, w * 0.26, h * 0.68);

  // Glowing neon signs & warm izakaya lanterns
  ctx.save();
  if (bgBlurPx > 0.5) {
    ctx.filter = `blur(${(bgBlurPx * 0.45).toFixed(1)}px)`;
  }

  const neonSigns = [
    { x: 0.14, y: 0.22, w: 0.09, h: 0.18, color: '#f43f5e' },
    { x: 0.18, y: 0.44, w: 0.08, h: 0.12, color: '#fbbf24' },
    { x: 0.78, y: 0.18, w: 0.1, h: 0.22, color: '#38bdf8' },
    { x: 0.75, y: 0.45, w: 0.09, h: 0.14, color: '#fb923c' },
    { x: 0.46, y: 0.34, w: 0.08, h: 0.1, color: '#a855f7' },
  ];

  for (const s of neonSigns) {
    const sx = w * s.x;
    const sy = h * s.y;
    const sw = w * s.w;
    const sh = h * s.h;

    const glow = ctx.createRadialGradient(
      sx + sw / 2,
      sy + sh / 2,
      4,
      sx + sw / 2,
      sy + sh / 2,
      sw * 2.2 * nightBoost
    );
    glow.addColorStop(0, s.color);
    glow.addColorStop(0.4, `${s.color}66`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sw * 1.5, sy - sh * 1.5, sw * 4, sh * 4);

    // Authentic dark signboard frame
    ctx.fillStyle = 'rgba(12, 14, 22, 0.88)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(sx, sy, sw, sh, 4) : ctx.rect(sx, sy, sw, sh);
    ctx.fill();

    // Vibrant neon tube outer border
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Glowing neon signage bars
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 1.5;
    const barCount = 3;
    const barSpacing = (sh - 12) / (barCount + 1);
    for (let b = 1; b <= barCount; b++) {
      const by = sy + 6 + b * barSpacing;
      ctx.beginPath();
      ctx.moveTo(sx + 6, by);
      ctx.lineTo(sx + sw - 6, by);
      ctx.stroke();
    }
  }

  // Bokeh street lights & traffic trails
  const orbs = [
    { x: 0.36, y: 0.56, r: 18, c: 'rgba(251, 191, 36, 0.75)' },
    { x: 0.44, y: 0.58, r: 14, c: 'rgba(244, 63, 94, 0.75)' },
    { x: 0.55, y: 0.57, r: 20, c: 'rgba(56, 189, 248, 0.7)' },
    { x: 0.62, y: 0.59, r: 15, c: 'rgba(251, 146, 60, 0.8)' },
  ];
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    const ox = w * o.x + Math.sin(t * 1.4 + i) * 10;
    const oy = h * o.y;
    ctx.beginPath();
    ctx.arc(ox, oy, o.r * nightBoost, 0, Math.PI * 2);
    ctx.fillStyle = o.c;
    ctx.fill();
  }
  ctx.restore();

  // Wet asphalt reflection streaks on lower 35%
  for (let i = 0; i < 24; i++) {
    const ry = h * 0.65 + (i / 24) * (h * 0.35);
    const rx = w * (0.2 + ((i * 7) % 10) * 0.06) + Math.sin(t * 2 + i) * 6;
    const colors = ['rgba(244,63,94,0.32)', 'rgba(56,189,248,0.32)', 'rgba(251,191,36,0.35)'];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(rx - 28, ry, 56 + (i % 5) * 12, 3.5);
  }
}

function drawMacroFloraScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  bgBlurPx: number
) {
  // Lush emerald botanical background
  ctx.save();
  const blurAmount = Math.max(3, bgBlurPx);
  ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
  const bg = ctx.createRadialGradient(w * 0.3, h * 0.3, 20, w * 0.5, h * 0.5, w * 0.85);
  bg.addColorStop(0, '#065f46');
  bg.addColorStop(0.5, '#064e3b');
  bg.addColorStop(1, '#022c22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Sharp macro eucalyptus leaf & crystalline morning dewdrops
  ctx.save();
  ctx.translate(w * 0.5, h * 0.52);
  ctx.rotate(-0.22 + Math.sin(t * 0.8) * 0.015);

  const leafGrad = ctx.createLinearGradient(-w * 0.4, -h * 0.18, w * 0.4, h * 0.18);
  leafGrad.addColorStop(0, '#34d399');
  leafGrad.addColorStop(0.5, '#10b981');
  leafGrad.addColorStop(1, '#047857');
  ctx.fillStyle = leafGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.38, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Central leaf vein & branching micro-veins
  ctx.strokeStyle = 'rgba(209, 250, 229, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, 0);
  ctx.lineTo(w * 0.36, 0);
  ctx.stroke();

  ctx.lineWidth = 1.4;
  for (let i = -4; i <= 4; i++) {
    const vx = i * (w * 0.065);
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx + 22, -h * 0.11);
    ctx.moveTo(vx, 0);
    ctx.lineTo(vx + 22, h * 0.11);
    ctx.stroke();
  }

  // Refractive water dewdrops on the leaf
  const drops = [
    { x: -w * 0.08, y: -h * 0.04, r: 26 },
    { x: w * 0.09, y: h * 0.03, r: 19 },
    { x: -w * 0.01, y: h * 0.06, r: 13 },
  ];
  for (const d of drops) {
    // Drop shadow
    ctx.fillStyle = 'rgba(2, 44, 34, 0.48)';
    ctx.beginPath();
    ctx.ellipse(d.x + 4, d.y + 6, d.r, d.r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Refractive sphere
    const dropGrad = ctx.createRadialGradient(
      d.x - d.r * 0.35,
      d.y - d.r * 0.35,
      2,
      d.x,
      d.y,
      d.r
    );
    dropGrad.addColorStop(0, '#ffffff');
    dropGrad.addColorStop(0.25, 'rgba(167, 243, 208, 0.85)');
    dropGrad.addColorStop(0.75, 'rgba(16, 185, 129, 0.45)');
    dropGrad.addColorStop(1, 'rgba(236, 253, 245, 0.9)');
    ctx.fillStyle = dropGrad;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders the Photo Stamp Studio watermark directly onto a 2D Canvas
 */
export function drawStampOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stamp: StampSettings,
  captureDate: Date = new Date()
): void {
  if (!stamp.enabled) return;

  const payload = formatStampPayload(stamp, captureDate);
  if (!payload.titleLine && !payload.timestampLine && !payload.locationLine) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0.2, Math.min(1, stamp.opacity));

  const scale = width / 1280;
  const baseFontSize = Math.max(12, Math.round(stamp.fontSize * scale));
  const fontStack =
    stamp.fontFamily === 'JetBrains Mono'
      ? '"JetBrains Mono", monospace'
      : stamp.fontFamily === 'Serif Classic'
        ? 'Georgia, serif'
        : '"Plus Jakarta Sans", sans-serif';

  const padX = Math.round(16 * scale);
  const padY = Math.round(12 * scale);
  const margin = Math.round(28 * scale);

  const lines = [payload.titleLine, payload.timestampLine, payload.locationLine].filter(Boolean);
  ctx.font = `600 ${baseFontSize}px ${fontStack}`;
  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width), 100 * scale);
  const logoSpace = stamp.showLogo ? Math.round(38 * scale) : 0;
  const boxW = Math.min(width - margin * 2, maxTextW + padX * 2 + logoSpace);
  const lineH = Math.round(baseFontSize * 1.35);
  const boxH = lines.length * lineH + padY * 2;

  let boxX = margin;
  let boxY = height - boxH - margin;

  if (stamp.customPosition) {
    boxX = Math.max(12, Math.min(width - boxW - 12, stamp.customPosition.x * width - boxW / 2));
    boxY = Math.max(12, Math.min(height - boxH - 12, stamp.customPosition.y * height - boxH / 2));
  } else {
    switch (stamp.position) {
      case 'bottom-left':
        boxX = margin;
        boxY = height - boxH - margin;
        break;
      case 'bottom-right':
        boxX = width - boxW - margin;
        boxY = height - boxH - margin;
        break;
      case 'top-left':
        boxX = margin;
        boxY = margin;
        break;
      case 'top-right':
        boxX = width - boxW - margin;
        boxY = margin;
        break;
      case 'bottom-center':
        boxX = (width - boxW) / 2;
        boxY = height - boxH - margin;
        break;
    }
  }

  if (stamp.showBackground) {
    ctx.fillStyle = 'rgba(12, 14, 20, 0.58)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14 * scale);
    ctx.fill();
  }

  if (stamp.showBorder) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14 * scale);
    ctx.stroke();
  }

  if (stamp.showShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetY = 2 * scale;
  }

  // Optional Optical Brand Emblem
  let textStartX = boxX + padX;
  if (stamp.showLogo) {
    const logoCx = boxX + padX + 14 * scale;
    const logoCy = boxY + boxH / 2;
    const r = 13 * scale;

    if (stamp.logoStyle === 'Leica Dot') {
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.round(9 * scale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PRO', logoCx, logoCy);
    } else {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vertical divider line like Leica / Xiaomi / iPhone Pro stamp
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(boxX + padX + 34 * scale, boxY + padY);
    ctx.lineTo(boxX + padX + 34 * scale, boxY + boxH - padY);
    ctx.stroke();

    textStartX = boxX + padX + logoSpace;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = stamp.textColor || '#ffffff';

  lines.forEach((line, idx) => {
    const isPrimary = idx === 0;
    const size = isPrimary ? baseFontSize : Math.round(baseFontSize * 0.84);
    ctx.font = `${isPrimary ? 600 : 400} ${size}px ${fontStack}`;
    ctx.fillStyle = isPrimary ? stamp.textColor : 'rgba(255, 255, 255, 0.82)';
    ctx.fillText(line, textStartX, boxY + padY + idx * lineH);
  });

  ctx.restore();
}

/**
 * Generates a complete high-resolution JPEG/PNG Data URL from either a live video element
 * or the active optical scene, applying filters, exposure, vignette, and Photo Stamp.
 */
export function renderCapturedPhotoToDataUrl(params: {
  videoEl?: HTMLVideoElement | null;
  hasLiveCamera: boolean;
  sceneOpts: SceneRenderOptions;
  aspectRatio: AspectRatioOption;
  filterId: FilterId;
  filterIntensity: number;
  exposureMultiplier: number;
  kelvin: number;
  adjustments: PhotoAdjustments;
  stamp: StampSettings;
}): { processedDataUrl: string; cleanOriginalDataUrl: string } {
  const baseW = 1080;
  let baseH = 1440; // 4:3 default
  if (params.aspectRatio === '16:9') baseH = 1920;
  else if (params.aspectRatio === '1:1') baseH = 1080;
  else if (params.aspectRatio === 'Full') baseH = 2160;

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = baseW;
  rawCanvas.height = baseH;
  const rawCtx = rawCanvas.getContext('2d')!;

  if (params.hasLiveCamera && params.videoEl && params.videoEl.readyState >= 2) {
    const vw = params.videoEl.videoWidth || 1280;
    const vh = params.videoEl.videoHeight || 720;
    const targetAspect = baseW / baseH;
    const videoAspect = vw / vh;
    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;
    if (videoAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }
    rawCtx.save();
    if (params.sceneOpts.isFrontCamera) {
      rawCtx.translate(baseW, 0);
      rawCtx.scale(-1, 1);
    }
    rawCtx.drawImage(params.videoEl, sx, sy, sw, sh, 0, 0, baseW, baseH);
    rawCtx.restore();
  } else {
    drawOpticalScene(rawCtx, baseW, baseH, params.sceneOpts);
  }

  const cleanOriginalDataUrl = rawCanvas.toDataURL('image/jpeg', 0.92);

  // Now render processed image with filter, tint, vignette, and stamp
  const outCanvas = document.createElement('canvas');
  outCanvas.width = baseW;
  outCanvas.height = baseH;
  const outCtx = outCanvas.getContext('2d')!;

  outCtx.save();
  outCtx.filter = buildCssFilterString(
    params.filterId,
    params.filterIntensity,
    params.exposureMultiplier,
    params.adjustments,
    params.kelvin
  );
  outCtx.drawImage(rawCanvas, 0, 0);
  outCtx.restore();

  // Filter color tint overlay
  const filterDef =
    PHOTOGRAPHIC_FILTERS.find((f) => f.id === params.filterId) || PHOTOGRAPHIC_FILTERS[0];
  if (filterDef.tintOverlay && params.filterIntensity > 0) {
    outCtx.save();
    outCtx.globalAlpha = params.filterIntensity / 100;
    outCtx.fillStyle = filterDef.tintOverlay;
    outCtx.fillRect(0, 0, baseW, baseH);
    outCtx.restore();
  }

  // Vignette overlay
  const totalVignette = Math.min(
    0.85,
    filterDef.vignetteBoost * (params.filterIntensity / 100) + params.adjustments.vignette / 140
  );
  if (totalVignette > 0.02) {
    const vigGrad = outCtx.createRadialGradient(
      baseW / 2,
      baseH / 2,
      baseW * 0.28,
      baseW / 2,
      baseH / 2,
      Math.max(baseW, baseH) * 0.68
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, `rgba(0,0,0,${totalVignette.toFixed(3)})`);
    outCtx.fillStyle = vigGrad;
    outCtx.fillRect(0, 0, baseW, baseH);
  }

  // Authentic Vintage Film Grain
  const effectiveGrain = Math.max(
    (filterDef.grainIntensity || 0) * (params.filterIntensity / 100),
    (params.adjustments.grain || 0) / 100
  );
  if (effectiveGrain > 0.02) {
    const imgData = outCtx.getImageData(0, 0, baseW, baseH);
    const data = imgData.data;
    const factor = effectiveGrain * 0.13 * 255;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * factor;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    outCtx.putImageData(imgData, 0, 0);
  }

  // Photo Stamp Studio overlay
  drawStampOverlayOnCanvas(outCtx, baseW, baseH, params.stamp, new Date());

  return {
    processedDataUrl: outCanvas.toDataURL('image/jpeg', 0.92),
    cleanOriginalDataUrl,
  };
}
