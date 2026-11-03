import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHOTOGRAPHIC_FILTERS,
  PHOTOGRAPHIC_STYLES,
  PHOTOSHOP_PRESETS,
  getOpticalLensSpec,
  parseShutterSpeedSeconds,
  computeExposureMultiplier,
  getEffectiveKelvin,
  buildCssFilterString,
  formatStampTimestamp,
  formatStampPayload,
  synthesizeExifData,
  computeLuminanceHistogram,
  DEFAULT_PHOTO_ADJUSTMENTS,
  DEFAULT_CURVE_POINTS,
  generateCurveLut,
  applyCurvesAndHslToImageData,
  parseExifMetadataDisplay,
  type ProControlsState,
  type StampSettings,
  type CapturedMediaItem,
} from './cameraEngine';
import { HAPTIC_PATTERNS, getZoomHapticType } from './hapticsEngine';

test('PHOTOGRAPHIC_FILTERS, PHOTOGRAPHIC_STYLES and PHOTOSHOP_PRESETS contain presets', () => {
  assert.ok(PHOTOGRAPHIC_FILTERS.length >= 100, `Expected >= 100 filters, got ${PHOTOGRAPHIC_FILTERS.length}`);
  assert.equal(PHOTOGRAPHIC_STYLES.length, 8);
  assert.equal(PHOTOSHOP_PRESETS.length, 10);
  const presetIds = PHOTOSHOP_PRESETS.map((p) => p.id);
  assert.ok(presetIds.includes('portra_400'));
  assert.ok(presetIds.includes('tri_x_400'));
  assert.ok(presetIds.includes('cinestill_800t'));
  assert.ok(presetIds.includes('teal_orange'));
  assert.ok(presetIds.includes('cyberpunk'));
  assert.ok(presetIds.includes('velvia_50'));
  const styleNames = PHOTOGRAPHIC_STYLES.map((s) => s.name);
  assert.deepEqual(styleNames, [
    'Standard',
    'Rich Contrast',
    'Vibrant',
    'Warm',
    'Cool',
    'Original',
    'Dramatic',
    'Mono',
  ]);
  const names = PHOTOGRAPHIC_FILTERS.map((f) => f.name);
  assert.ok(names.includes('Original'));
  assert.ok(names.includes('Vivid Warm'));
  assert.ok(names.includes('Dramatic Cool'));
  assert.ok(names.includes('Silvertone'));
  assert.ok(names.includes('Noir'));
  assert.ok(names.includes('Kodak Portra 400'));
  assert.ok(names.includes('Kodachrome 64'));
  assert.ok(names.includes('Fujifilm Velvia 50'));
  assert.ok(names.includes('Polaroid SX-70'));
  assert.ok(names.includes('Leica M3 50mm Summicron'));
  assert.ok(names.includes('CineStill 800T'));
});

test('getOpticalLensSpec maps zoom levels to realistic 35mm focal lengths', () => {
  const ultraWide = getOpticalLensSpec(0.5, false);
  assert.equal(ultraWide.focalLengthMm, 13);
  assert.equal(ultraWide.apertureFStop, 2.2);

  const main1x = getOpticalLensSpec(1.0, false);
  assert.equal(main1x.focalLengthMm, 24);
  assert.equal(main1x.apertureFStop, 1.78);

  const tele3x = getOpticalLensSpec(3.0, false);
  assert.equal(tele3x.focalLengthMm, 72);
  assert.equal(tele3x.apertureFStop, 2.8);

  const front = getOpticalLensSpec(1.0, true);
  assert.equal(front.focalLengthMm, 23);
});

test('parseShutterSpeedSeconds parses fractions and full seconds accurately', () => {
  assert.equal(parseShutterSpeedSeconds('1/250'), 1 / 250);
  assert.equal(parseShutterSpeedSeconds('1/4'), 0.25);
  assert.equal(parseShutterSpeedSeconds('1s'), 1);
});

test('computeExposureMultiplier responds to EV and Pro manual ISO/Shutter', () => {
  const basePro: ProControlsState = {
    iso: 'Auto',
    shutterSpeed: 'Auto',
    focusDistance: 'Auto',
    whiteBalance: 'Auto',
    kelvin: 5600,
    ev: 0,
    rawDng: false,
    histogramEnabled: true,
  };
  assert.equal(computeExposureMultiplier(0, basePro, 'Photo'), 1);
  assert.ok(computeExposureMultiplier(1.5, basePro, 'Photo') > 1.4);
  assert.ok(computeExposureMultiplier(-1.5, basePro, 'Photo') < 0.7);

  const highIsoPro: ProControlsState = {
    ...basePro,
    iso: 3200,
    shutterSpeed: '1/15',
  };
  assert.ok(computeExposureMultiplier(0, highIsoPro, 'Pro') > 1.5);
});

test('getEffectiveKelvin maps presets and clamps manual Kelvin range', () => {
  assert.equal(getEffectiveKelvin('Daylight', 5600), 5500);
  assert.equal(getEffectiveKelvin('Tungsten', 5600), 3200);
  assert.equal(getEffectiveKelvin('Manual', 9900), 9000);
  assert.equal(getEffectiveKelvin('Manual', 1800), 2500);
});

test('buildCssFilterString produces valid CSS filter pipeline string', () => {
  const css = buildCssFilterString(
    'noir',
    100,
    1.1,
    { ...DEFAULT_PHOTO_ADJUSTMENTS, contrast: 25, exposure: 10 },
    5600
  );
  assert.ok(css.includes('brightness('));
  assert.ok(css.includes('contrast('));
  assert.ok(css.includes('saturate(0.000)')); // Noir has 0 saturation at 100%
});

test('formatStampTimestamp and formatStampPayload format date, model, and GPS lines', () => {
  const sampleDate = new Date(2026, 10, 2, 19, 25, 9);
  const stamp: StampSettings = {
    enabled: true,
    showDate: true,
    showTime: true,
    showDeviceModel: true,
    deviceModelText: 'iCam Pro 48MP',
    customText: 'Shot by Tanmoy',
    showGps: true,
    gpsCoordinates: '37.7749° N, 122.4194° W',
    locationName: 'San Francisco, CA',
    showLogo: true,
    logoStyle: 'iCam Ring',
    fontFamily: 'JetBrains Mono',
    fontSize: 16,
    textColor: '#ffffff',
    opacity: 0.9,
    showBackground: true,
    showBorder: true,
    showShadow: true,
    position: 'bottom-left',
    dateFormat: 'YYYY.MM.DD',
  };

  const ts = formatStampTimestamp(sampleDate, stamp);
  assert.equal(ts, '2026.11.02  19:25:09');

  const payload = formatStampPayload(stamp, sampleDate);
  assert.equal(payload.titleLine, 'iCam Pro 48MP  |  Shot by Tanmoy');
  assert.equal(payload.timestampLine, '2026.11.02  19:25:09');
  assert.ok(payload.locationLine.includes('San Francisco, CA'));
  assert.ok(payload.locationLine.includes('37.7749° N'));
});

test('synthesizeExifData and computeLuminanceHistogram produce accurate telemetry', () => {
  const exif = synthesizeExifData({
    zoom: 2.0,
    isFrontCamera: false,
    mode: 'Pro',
    pro: {
      iso: 400,
      shutterSpeed: '1/500',
      focusDistance: 0.5,
      whiteBalance: 'Daylight',
      kelvin: 5500,
      ev: 0.3,
      rawDng: true,
      histogramEnabled: true,
    },
    ev: 0.3,
    filterId: 'vivid_warm',
    rawEnabled: true,
    aspectRatio: '4:3',
  });

  assert.equal(exif.focalLengthMm, 48);
  assert.equal(exif.megapixels, 48.0);
  assert.equal(exif.iso, 400);
  assert.equal(exif.shutterSpeed, '1/500');
  assert.equal(exif.colorSpace, 'Adobe RGB (RAW DNG)');

  const pixels = new Uint8ClampedArray(64 * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 200;
    pixels[i + 1] = 200;
    pixels[i + 2] = 200;
    pixels[i + 3] = 255;
  }
  const hist = computeLuminanceHistogram(pixels, 16);
  assert.equal(hist.length, 16);
  assert.equal(Math.max(...hist), 1);
});

test('ProControlsState supports Focus Peaking settings with customizable colors', () => {
  const proWithPeaking: ProControlsState = {
    iso: 100,
    shutterSpeed: '1/125',
    focusDistance: 0.35,
    whiteBalance: 'Auto',
    kelvin: 5600,
    ev: 0,
    rawDng: true,
    histogramEnabled: true,
    focusPeakingEnabled: true,
    focusPeakingColor: 'cyan',
  };

  assert.equal(proWithPeaking.focusPeakingEnabled, true);
  assert.equal(proWithPeaking.focusPeakingColor, 'cyan');
  assert.equal(proWithPeaking.focusDistance, 0.35);
});

test('generateCurveLut creates monotonic lookup tables for Photoshop curves', () => {
  const identityLut = generateCurveLut(DEFAULT_CURVE_POINTS);
  assert.equal(identityLut.length, 256);
  assert.equal(identityLut[0], 0);
  assert.equal(identityLut[128], 128);
  assert.equal(identityLut[255], 255);

  // S-Curve: lifts highlights, deepens shadows
  const sCurvePoints = [
    { x: 0, y: 0 },
    { x: 64, y: 40 },
    { x: 128, y: 128 },
    { x: 192, y: 220 },
    { x: 255, y: 255 },
  ];
  const sCurveLut = generateCurveLut(sCurvePoints);
  assert.ok(sCurveLut[64] < 64, 'Shadows should be pulled darker');
  assert.ok(sCurveLut[192] > 192, 'Highlights should be pulled brighter');
});

test('applyCurvesAndHslToImageData modifies image pixels according to curves and HSL', () => {
  const pixelData = new Uint8ClampedArray(4 * 4); // 4 pixels
  // Initialize with neutral gray
  for (let i = 0; i < pixelData.length; i += 4) {
    pixelData[i] = 128;
    pixelData[i + 1] = 128;
    pixelData[i + 2] = 128;
    pixelData[i + 3] = 255;
  }

  // Boost red curve
  const redBoostAdjustments = {
    ...DEFAULT_PHOTO_ADJUSTMENTS,
    curves: {
      rgb: DEFAULT_PHOTO_ADJUSTMENTS.curves?.rgb || [],
      red: [
        { x: 0, y: 0 },
        { x: 64, y: 100 },
        { x: 128, y: 190 },
        { x: 192, y: 230 },
        { x: 255, y: 255 },
      ],
      green: DEFAULT_PHOTO_ADJUSTMENTS.curves?.green || [],
      blue: DEFAULT_PHOTO_ADJUSTMENTS.curves?.blue || [],
    },
  };

  applyCurvesAndHslToImageData(pixelData, redBoostAdjustments);
  assert.ok(pixelData[0] > 150, `Red should be boosted, got ${pixelData[0]}`);
  assert.equal(pixelData[1], 128, 'Green should stay 128');
  assert.equal(pixelData[2], 128, 'Blue should stay 128');
});

test('Haptics engine provides distinct vibration patterns for zoom levels (0.5x, 1x, 2x, 3x), mode switching, shutter release, and long press', () => {
  assert.ok(Array.isArray(HAPTIC_PATTERNS.shutterRelease));
  assert.ok(Array.isArray(HAPTIC_PATTERNS.modeSwitch));
  assert.ok(Array.isArray(HAPTIC_PATTERNS.longPress));

  // Verify distinct zoom patterns for 0.5x, 1x, 2x, 3x
  assert.equal(getZoomHapticType(0.5), 'zoom0_5x');
  assert.equal(getZoomHapticType(1.0), 'zoom1x');
  assert.equal(getZoomHapticType(2.0), 'zoom2x');
  assert.equal(getZoomHapticType(3.0), 'zoom3x');

  assert.notDeepEqual(HAPTIC_PATTERNS.zoom0_5x, HAPTIC_PATTERNS.zoom1x);
  assert.notDeepEqual(HAPTIC_PATTERNS.zoom1x, HAPTIC_PATTERNS.zoom2x);
  assert.notDeepEqual(HAPTIC_PATTERNS.zoom2x, HAPTIC_PATTERNS.zoom3x);
});

test('parseExifMetadataDisplay parses shutter speed, ISO, focal length, aperture, and lens for Gallery Info overlay', () => {
  const sampleItem: CapturedMediaItem = {
    id: 'test-photo-1',
    type: 'photo',
    dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/',
    createdAt: new Date(2026, 10, 2, 14, 30, 0).toISOString(),
    favorite: true,
    adjustments: { ...DEFAULT_PHOTO_ADJUSTMENTS },
    exif: {
      lensLabel: '24mm f/1.78 Fusion Main',
      focalLengthMm: 24,
      apertureFStop: 1.78,
      iso: 100,
      shutterSpeed: '1/125',
      ev: 0.3,
      resolutionPx: '8064 × 6048',
      megapixels: 48.0,
      colorSpace: 'Display P3',
      filterName: 'Kodak Portra 400',
      mode: 'Photo',
      timestampIso: new Date(2026, 10, 2, 14, 30, 0).toISOString(),
    },
  };

  const parsed = parseExifMetadataDisplay(sampleItem);
  assert.equal(parsed.focalLength35mm, '24 mm');
  assert.equal(parsed.apertureDisplay, 'ƒ/1.78');
  assert.equal(parsed.shutterSpeedDisplay, '1/125 s');
  assert.equal(parsed.isoDisplay, 'ISO 100');
  assert.equal(parsed.evDisplay, '+0.3 EV');
  assert.equal(parsed.lensModel, '24mm f/1.78 Fusion Main');
  assert.equal(parsed.megapixelsDisplay, '48 MP');
  assert.equal(parsed.fileFormat, 'HEIF / JPEG');
});
