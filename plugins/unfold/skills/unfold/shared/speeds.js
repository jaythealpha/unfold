// Playback speeds shared by the skills: seconds for the whole 0–100 bar.
// The slowest preset is 1×; the others are labelled by how many times faster they run.
// The keys stay as they were so old ?speed= links keep working.
export const SPEEDS = { xslow: 60, slow: 30, normal: 20, fast: 12 };
export const DEFAULT_SPEED = 'slow';
const ORDER = Object.keys(SPEEDS);

// "1×", "2×", "3×", "5×": the same in every language
export const speedLabel = speed => `${+(SPEEDS.xslow / SPEEDS[speed]).toFixed(1)}×`;

// the bar position after dtSec seconds of playback at a speed, clamped to 100
export const advance = (t, dtSec, speed) => Math.min(100, t + dtSec * 100 / (SPEEDS[speed] || SPEEDS[DEFAULT_SPEED]));

// one step slower (dir < 0) or faster (dir > 0), staying inside the presets
export function stepSpeed(speed, dir) {
  const i = Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(speed) + Math.sign(dir)));
  return ORDER[i];
}
