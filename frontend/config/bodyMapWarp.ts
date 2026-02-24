/**
 * Body Map Configuration
 * 
 * This file controls the aesthetic warping and styling of body map SVGs at runtime.
 * Changes here affect both front and back views for each gender.
 * 
 * ============================================================================
 * STYLING
 * ============================================================================
 * 
 * Stroke color and width for the body outline/linework.
 * - strokeColor: Any valid CSS color (hex, rgb, named, etc.)
 * - strokeWidth: Width in pixels (typical range: 1-3)
 * 
 * ============================================================================
 * WARPING
 * ============================================================================
 * 
 * HOW WIDTH VALUES WORK:
 * - Positive amount values (e.g., 0.1) = SLIMMER/NARROWER in that region
 * - Negative amount values (e.g., -0.1) = WIDER/BROADER in that region  
 * - Zero amount = no change from original SVG
 * - Typical range: -0.2 to +0.3 (extreme values may look unnatural)
 * 
 * - yPosition controls WHERE the warp center is on the Y-axis (0-1200 range)
 * - sigma controls how WIDE/SMOOTH the transition is (smaller = more focused, larger = smoother)
 * 
 * HOW HEIGHT WORKS:
 * - heightScale: 1.0 = normal, >1.0 = taller, <1.0 = shorter
 * - Typical range: 0.9 to 1.15 (0.95 = 5% shorter, 1.05 = 5% taller)
 * - viewBox automatically adjusts to prevent clipping
 * 
 * REGION GUIDE (default Y-positions on the SVG, Y increases downward):
 * - Shoulders: ~200 (affects deltoid/trap area width)
 * - Chest/Pecs: ~320 (affects upper torso/pec width)
 * - Upper Abs: ~430 (affects upper abdominal area)
 * - Waist: ~520 (affects narrowest part of torso)
 * - Lower Abs/Hips: ~620 (affects hip/flank area)
 * - Thighs: ~800 (affects quadriceps/hamstring bulk)
 * - Calves: ~980 (affects lower leg width)
 */

// ============================================================================
// STROKE / OUTLINE STYLING
// ============================================================================

export interface BodyMapStrokeConfig {
  color: string;       // Stroke color (CSS color value)
  width: number;       // Stroke width in pixels
  opacity: number;     // Stroke opacity for zero-volume muscles (0-1)
  linecap: 'butt' | 'round' | 'square';
  linejoin: 'miter' | 'round' | 'bevel';
}

/**
 * Default stroke styling for body map outlines
 */
export const BODYMAP_STROKE: BodyMapStrokeConfig = {
  color: '#484a68',
  width: 1,
  opacity: 0.5,
  linecap: 'round',
  linejoin: 'round',
};

// ============================================================================
// WARP PARAMETERS
// ============================================================================

export interface BodyRegionWarp {
  amount: number;     // How much to warp: positive = slimmer, negative = wider
  yPosition: number;  // Where on Y-axis (0-1200, higher = lower on body)
  sigma: number;      // How smooth/focused: smaller = more focused, larger = smoother
}

export interface BodyWarpParams {
  heightScale?: number;   // Uniform height: 1.0 = normal, >1 = taller, <1 = shorter
  shoulders?: Partial<BodyRegionWarp>;
  chest?: Partial<BodyRegionWarp>;
  upperAbs?: Partial<BodyRegionWarp>;
  waist?: Partial<BodyRegionWarp>;
  lowerAbs?: Partial<BodyRegionWarp>;
  thighs?: Partial<BodyRegionWarp>;
  calves?: Partial<BodyRegionWarp>;
}

export interface ResolvedBodyWarpParams {
  heightScale: number;    // Uniform height scale
  shoulders: BodyRegionWarp;
  chest: BodyRegionWarp;
  upperAbs: BodyRegionWarp;
  waist: BodyRegionWarp;
  lowerAbs: BodyRegionWarp;
  thighs: BodyRegionWarp;
  calves: BodyRegionWarp;
}

export interface BodyMapWarpConfig {
  male: ResolvedBodyWarpParams;
  female: ResolvedBodyWarpParams;
}

const region = (amount: number, yPosition: number, sigma: number): BodyRegionWarp => ({
  amount,
  yPosition,
  sigma,
});

// ============================================================================
// MALE BODY WARP
// ============================================================================

/**
 * MALE BODY WARP
 * 
 * Goal: Athletic, V-taper physique with broad shoulders and tapered waist
 */
export const MALE_WARP: ResolvedBodyWarpParams = {
  heightScale: 1.15,
  shoulders: region(-0.5, 200, 80),    // Broader shoulders
  chest: region(-0.05, 320, 100),       // Fuller chest/pecs
  upperAbs: region(0.04, 430, 80),      // Slight taper
  waist: region(0.15, 520, 100),        // Tapered waist for V-taper
  lowerAbs: region(0, 620, 80),         // Smooth transition to hips
  thighs: region(-0, 800, 150),         // Slightly more muscular thighs
  calves: region(0, 980, 100),          // No change
};

// ============================================================================
// FEMALE BODY WARP
// ============================================================================

/**
 * FEMALE BODY WARP
 * 
 * Goal: Hourglass figure with defined waist and balanced proportions
 */
export const FEMALE_WARP: ResolvedBodyWarpParams = {
  heightScale: 1.15,
  shoulders: region(0.02, 200, 80),     // Slightly narrower shoulders
  chest: region(-0.1, 320, 100),        // Fuller bust area
  upperAbs: region(0.08, 430, 80),      // Taper toward waist
  waist: region(0.15, 520, 100),        // Significantly tapered for hourglass
  lowerAbs: region(-0.2, 580, 100),     // Wider hips for hourglass
  thighs: region(0, 800, 150),          // Balanced thighs
  calves: region(0.1, 980, 100),        // Slimmer calves
};

// ============================================================================
// COMBINED CONFIG
// ============================================================================

export const BODYMAP_WARP_CONFIG: BodyMapWarpConfig = {
  male: MALE_WARP,
  female: FEMALE_WARP,
};

// ============================================================================
// QUICK TWEAK GUIDE
// ============================================================================

/**
 * QUICK TWEAK GUIDE:
 * 
 * HEIGHT:
 *   heightScale: 1.05        - 5% taller
 *   heightScale: 0.95        - 5% shorter
 *   heightScale: 1.15        - 15% taller (current default)
 * 
 * STROKE:
 *   BODYMAP_STROKE.color = '#333333'     - Darker outline
 *   BODYMAP_STROKE.width = 2              - Thicker outline
 * 
 * For MORE HOURGLASS (female):
 *   waist: { amount: 0.2 }           - Even slimmer waist
 *   lowerAbs: { amount: -0.08 }      - Wider hips
 *   lowerAbs: { yPosition: 650 }     - Move hip warp lower
 * 
 * For MORE MUSCULAR/ATHLETIC (male):
 *   shoulders: { amount: -0.05 }     - Broader shoulders
 *   chest: { amount: -0.08 }         - Bigger pecs
 *   thighs: { amount: -0.05 }        - Bigger legs
 *   thighs: { sigma: 120 }           - Smoother thigh transition
 * 
 * For SLIMMER OVERALL:
 *   - Increase positive amounts
 *   - Reduce negative amounts toward zero
 * 
 * To MOVE a warp region:
 *   waist: { yPosition: 550 }        - Move waist warp lower
 *   waist: { yPosition: 490 }        - Move waist warp higher
 * 
 * To make warp MORE FOCUSED/sharp:
 *   waist: { sigma: 60 }             - Smaller sigma = more focused
 * 
 * To make warp MORE GRADUAL/smooth:
 *   waist: { sigma: 150 }            - Larger sigma = smoother gradient
 */
