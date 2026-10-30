// Fold kinematics for foldable phones. Pure (no DOM, no three.js), shared by the page and Gate 1.
// The phone lies open with the inner display down (z = 0 at its surface). The fold line runs along the axis
// ('y': a book-style fold, u = x; 'x': a clamshell, u = y) at u = at. Half A stays put; half B (the half with
// the cover display, on the +u side unless fold.b is '-') turns about an axis in the middle of the gap the shut
// halves leave (u = at, z = -gap/2), so its spine edge stays flush with A's, as on the real phones.
// How a part moves with the fold (its "motion"):
//   'a'     stays put                     'b'    turns rigidly with half B
//   'bend'  thin layers that cross the fold (the inner screen, films, cables): they wrap round the axis and slide
//   'split' thick hinge-group parts: whatever lies on A's side stays, whatever lies on B's side turns with B
//   'mid'   the hinge barrel: turns by half the angle
// fold.spine is how far the shut spine (the hinge cover) stands out beyond the halves; the page draws it.

const num = v => (typeof v === 'number' && isFinite(v) ? v : NaN);

export function foldInfo(model) {
  const f = model.product?.fold; if (!f) return null;
  const gap = num(f.gap ?? 2);
  return { axis: f.axis === 'x' ? 'x' : 'y', at: num(f.at), gap, r: gap / 2, L: Math.PI * gap / 2, spine: num(f.spine ?? 0),
    T: model.product.dims.t, bSign: f.b === '-' ? -1 : 1, span: f.axis === 'x' ? model.product.dims.l : model.product.dims.w };
}

// which half a part rides on: an explicit `half`, else by its box against the fold line (straddling = hinge)
export function halfOf(model, part, fi = foldInfo(model)) {
  if (!fi) return 'a';
  if (part.half === 'a' || part.half === 'b' || part.half === 'hinge') return part.half;
  const b = part.bbox, lo = fi.axis === 'x' ? b[1] : b[0], hi = fi.axis === 'x' ? b[4] : b[3];
  if (lo < fi.at - 2 && hi > fi.at + 2) return 'hinge';
  return ((lo + hi) / 2 - fi.at) * fi.bSign > 0 ? 'b' : 'a';
}

// the hinge barrel turns by half the angle, so when shut it stands out of the spine by z0 + 2r + gap/2: it is
// kept thin enough to stay inside the spine (fold.spine)
export function hingeBarrel(part, fi) {
  const z0 = part.bbox[2], free = fi ? fi.spine - fi.gap / 2 : Infinity;      // room from the fold axis to the spine's face
  const r = Math.max(0.2, Math.min(1.6, (part.bbox[5] - z0) / 2, free / 2));
  // sit on the hinge's floor if that still fits, else lower (toward the screen) so it stays inside the spine
  return { r, zc: Math.max(r * 0.5, Math.min(z0 + r, free - r)) };
}

// how far the halves' frames stop short of the fold line (the trough the shut spine has to fill)
export function spineBand(model, fi = foldInfo(model)) {
  let band = 0;
  for (const p of model.parts) {
    if (!['housing', 'ring'].includes(p.shape?.template)) continue;
    const h = halfOf(model, p, fi); if (h === 'hinge') continue;
    const b = p.bbox, lo = fi.axis === 'x' ? b[1] : b[0], hi = fi.axis === 'x' ? b[4] : b[3];
    const gap = ((h === 'a') === (fi.bSign > 0)) ? fi.at - hi : lo - fi.at;
    band = Math.max(band, gap);
  }
  return Math.max(0, band);
}

// only the screen stack bends (the folding screen and the thin layers on it, within BEND_MAX_Z of its surface);
// everything else in the hinge group, cables included, splits at the fold line and rides with its own side
export const BEND_MAX_T = 0.8, BEND_MAX_Z = 1.3;
export function motionOf(model, part, fi = foldInfo(model)) {
  const h = halfOf(model, part, fi);
  if (h !== 'hinge') return h;
  const s = part.shape || {}, thick = part.bbox[5] - part.bbox[2];
  return s.template === 'flexdisplay' || (s.columns && thick <= BEND_MAX_T && part.bbox[5] <= BEND_MAX_Z) ? 'bend' : 'split';
}

// rotate (du, dz) about the fold axis by phi toward -z
const turn = (du, dz, phi) => [du * Math.cos(phi) + dz * Math.sin(phi), -du * Math.sin(phi) + dz * Math.cos(phi)];

// a point (u across the fold, z through the phone) on a bending layer; u is on the "+" convention (B on the
// high side). A side: still. Just past the fold line: wrapped round the axis. Further: carried with B, slid
// back by the wrapped length (a folding screen slides a little, as real ones do).
export function bendPoint(fi, u, z, deg) {
  const th = deg * Math.PI / 180, r = fi.r, d = u - fi.at;
  if (th < 1e-9 || d <= 0) return [u, z];
  const wrap = r * th, [du, dz] = d <= wrap ? turn(0, z + r, d / r) : turn(d - wrap, z + r, th);
  return [fi.at + du, -r + dz];
}

// half B as one rigid piece, turning about the fold axis
function bRigid(fi, u, z, deg, frac = 1) {
  const th = deg * Math.PI / 180 * frac, r = fi.r;
  if (th < 1e-9) return [u, z];
  const [du, dz] = turn(u - fi.at, z + r, th);
  return [fi.at + du, -r + dz];
}

// a model point [x, y, z] moving the given way at fold angle deg
export function mapPoint(fi, motion, p, deg) {
  if (!fi || motion === 'a') return [...p];
  const ax = fi.axis === 'x', u = ax ? p[1] : p[0], um = fi.bSign > 0 ? u : 2 * fi.at - u;
  const [u2, z2] = motion === 'b' ? bRigid(fi, um, p[2], deg)
    : motion === 'mid' ? bRigid(fi, um, p[2], deg, 0.5)
    : motion === 'split' ? (um <= fi.at ? [um, p[2]] : bRigid(fi, um, p[2], deg))
    : bendPoint(fi, um, p[2], deg);
  const uo = fi.bSign > 0 ? u2 : 2 * fi.at - u2;
  return ax ? [p[0], uo, z2] : [uo, p[1], z2];
}

// half B's rigid motion as a 3×4 matrix (rows) in model coordinates, for the renderer
export function bAffine(fi, deg) {
  const o = mapPoint(fi, 'b', [0, 0, 0], deg), ex = mapPoint(fi, 'b', [1, 0, 0], deg), ey = mapPoint(fi, 'b', [0, 1, 0], deg), ez = mapPoint(fi, 'b', [0, 0, 1], deg);
  const col = q => q.map((v, i) => v - o[i]);
  const [cx, cy, cz] = [col(ex), col(ey), col(ez)];
  return [0, 1, 2].map(r => [cx[r], cy[r], cz[r], o[r]]);
}

// the axis-aligned box of a box after folding. Bending boxes are sampled finely through the wrap; split boxes
// are cut at the fold line first.
export function foldedBox(fi, box, motion, deg) {
  const U = fi.axis === 'x' ? 1 : 0, V = 1 - U;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const us = new Set([box.min[U], box.max[U]]);
  if (motion === 'bend' || motion === 'split') {
    const wrap = fi.r * deg * Math.PI / 180, near = [fi.at - 1e-6, fi.at + 1e-6];
    for (let i = 0; i <= 40; i++) near.push(fi.at + fi.bSign * (wrap + 0.5) * i / 40);
    for (const u of near) if (u > box.min[U] && u < box.max[U]) us.add(u);
  }
  for (const u of us) for (const v of [box.min[V], box.max[V]]) for (const z of [box.min[2], box.max[2]]) {
    const p = [0, 0, z]; p[U] = u; p[V] = v;
    const r = mapPoint(fi, motion, p, deg);
    for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], r[a]); hi[a] = Math.max(hi[a], r[a]); }
  }
  return { min: lo, max: hi };
}

// the folded size, measured on the parts themselves (z kept within the body, so camera bumps don't count),
// plus the spine's hinge cover
export function foldedOutline(model, deg) {
  const fi = foldInfo(model), { t } = model.product.dims;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const grow = fb => { for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], fb.min[k]); max[k] = Math.max(max[k], fb.max[k]); } };
  for (const p of model.parts) {
    const b = p.bbox; if (!Array.isArray(b) || b.length !== 6) continue;
    const z0 = Math.max(0, Math.min(t, b[2])), z1 = Math.max(0, Math.min(t, b[5]));
    if (z1 - z0 < 1e-6) continue;
    grow(foldedBox(fi, { min: [b[0], b[1], z0], max: [b[3], b[4], z1] }, motionOf(model, p, fi), deg));
    // a hinge's barrel turns by half the angle
    if (p.shape?.template === 'hinge') {
      const { r, zc } = hingeBarrel(p, fi), U = fi.axis === 'x' ? 1 : 0, V = 1 - U, bx = { min: [0, 0, zc - r], max: [0, 0, zc + r] };
      bx.min[U] = fi.at - r; bx.max[U] = fi.at + r; bx.min[V] = b[V]; bx.max[V] = b[V + 3];
      grow(foldedBox(fi, bx, 'mid', deg));
    }
  }
  const U = fi.axis === 'x' ? 1 : 0, spine = (fi.spine || 0) * Math.min(1, deg / 180);
  if (fi.bSign > 0) max[U] = Math.max(max[U], fi.at + spine); else min[U] = Math.min(min[U], fi.at - spine);
  const size = [0, 1, 2].map(k => max[k] - min[k]);
  return { w: size[0], l: size[1], t: size[2], min, max };
}
