/** Style bible (brief section 2 + 7) as numbers. */

const luma709 = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export const GROUND = '#333333';
export const BLACK = '#0D0D0D';
export const WARM = [0xf1, 0xe2, 0xc6]; // warm light, never above 10 %
const WARM_LUMA = luma709(WARM);

// Komorebi (multiply): 6 % darker on the paper, at most 3 % on the logo.
// Composited into the paper in float with dither (PaperCanvas) — an 8-bit
// low-opacity CSS layer would posterise the soft shade into hard plateaus.
// The leaf masses are kept clear of the logo, so the logo receives 0 %.
export const KOMOREBI_PAPER = 0.06;
export const KOMOREBI_LOGO_MAX = 0.03;
export const KOMOREBI_PARALLAX = 1.3; // moves 1.3x as much as the paper
export const KOMOREBI_DRIFT_PX = 24; // over the piece
export const KOMOREBI_DRIFT_DIR = [0.8, 0.6];
export const KOMOREBI_SWAY_PX = 10; // +-10 px
export const KOMOREBI_SWAY_DIR = [0.966, -0.259];
export const KOMOREBI_SWAY_PERIOD_S = 7;

// Light pass: soft warm vertical band, 40 % of the frame wide (FWHM),
// Gaussian falloff. Logo up to +8 % brightness, paper +2 % (of full scale).
export const LIGHT_BAND_FWHM = 0.4;
export const LIGHT_PAPER = 0.02 / WARM_LUMA; // warm light on the paper (~2.2 %, in PaperCanvas)
export const LIGHT_LOGO = 0.08 / WARM_LUMA; // warm light on the logo (~9.0 %, masked band)

// Wet ink: 108 % brightness over the last 12 % of the drawn path.
export const WET_BOOST = 0.08;
export const WET_LENGTH = 0.12;
export const WET_STEPS = 8;

export const VIGNETTE = 0.08; // soft 8 %

// Film grain: monochrome, new seeded pattern every 2 frames, overlay blend.
// sigma in levels of the grain layer; on the #333 paper overlay scales it by
// 2 * 0.2 -> ~1.9 levels sigma, i.e. ~+-1.5 % at 2 sigma.
export const GRAIN_SIGMA = 4.8;
export const GRAIN_HOLD_FRAMES = 2;

// Brush edge filter (section 5).
export const BRUSH_TURBULENCE = {baseFrequency: 0.9, numOctaves: 2, seed: 7};
export const BRUSH_DISPLACEMENT = 10;
export const BRUSH_BLUR = 3;
