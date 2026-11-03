/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Granular iOS Taptic Engine emulator using Web Vibration API.
 * Recreates authentic Apple iPhone physical feedback:
 * - Shutter mechanical click & curtain recoil
 * - Mode dial switch notches
 * - Distinct optical lens zoom detents (0.5x, 1x, 2x, 3x)
 * - QuickTake long-press charge and latch
 * - Subtle wheel dial steps and sliders
 */

export type HapticType =
  | 'selection'        // Light tick: slider adjustment, button tap (6ms)
  | 'shutter'          // Shutter button press (15ms)
  | 'shutterRelease'   // Authentic iOS mechanical shutter release: pre-charge + curtain snap + recoil [12, 28, 22]ms
  | 'modeSwitch'       // Mode selector snap [10, 24, 10]ms
  | 'longPress'        // QuickTake / Focus-Lock buildup [18, 45, 32]ms
  | 'zoomDetent'       // Generic optical lens click [8]ms
  | 'zoom0_5x'         // Ultra-wide 0.5x (13mm) wide-angle soft double pulse [5, 16, 7]ms
  | 'zoom1x'           // Main 1x (24mm) primary home anchor crisp click [10]ms
  | 'zoom2x'           // Optical 2x (48mm) sensor crop stepped pulse [7, 14, 11]ms
  | 'zoom3x'           // Telephoto 3x (77mm) periscope mechanical lock [9, 18, 14]ms
  | 'burstTick'        // Machine-gun burst capture [6, 14, 6]ms
  | 'rigid'            // Rigid AE/AF Lock [22]ms
  | 'medium'           // Sheet drawer open / close [14]ms
  | 'heavy'            // Hardware toggle switch [20]ms
  | 'success'          // Dual confirmation chirp [10, 30, 16]ms
  | 'warning'          // Alert triple thud [15, 35, 15, 35, 20]ms
  | 'dialTick';        // Micro dial tick [4]ms

export const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 6,
  dialTick: 4,
  zoomDetent: 8,
  zoom0_5x: [5, 16, 7],
  zoom1x: 10,
  zoom2x: [7, 14, 11],
  zoom3x: [9, 18, 14],
  medium: 14,
  heavy: 20,
  rigid: 22,
  shutter: 16,
  shutterRelease: [12, 25, 22],
  modeSwitch: [10, 22, 12],
  longPress: [18, 40, 32],
  burstTick: [6, 14, 6],
  success: [10, 30, 16],
  warning: [15, 35, 15, 35, 20],
};

/**
 * Returns the distinct lens-specific haptic pattern for a given optical zoom level
 */
export function getZoomHapticType(zoomValue: number): HapticType {
  if (zoomValue <= 0.6) return 'zoom0_5x';
  if (zoomValue <= 1.2) return 'zoom1x';
  if (zoomValue <= 2.2) return 'zoom2x';
  return 'zoom3x';
}

let hapticEnabled = true;

/**
 * Configure global haptic preference
 */
export function setHapticsEnabled(enabled: boolean): void {
  hapticEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticEnabled;
}

/**
 * Triggers a granular haptic feedback pattern
 */
export function triggerHaptic(
  typeOrPattern: HapticType | number | number[] = 'selection',
  enabled = true
): void {
  if (!hapticEnabled || !enabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const pattern =
        typeof typeOrPattern === 'string'
          ? HAPTIC_PATTERNS[typeOrPattern] ?? 6
          : typeOrPattern;
      navigator.vibrate(pattern);
    }
  } catch {
    // Gracefully ignore on platforms where vibration is restricted
  }
}
