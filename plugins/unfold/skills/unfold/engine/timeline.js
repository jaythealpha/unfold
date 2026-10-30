// The time bar tells one story for every phone: the finished phone (0) turns over or unfolds (0-4), its parts
// burst out (4-8), the steps put it back together (8-92), and it turns over or folds shut and lights up (92-100).
// Pure: a pose depends only on (model, layout, t), so scrubbing, playing and switching layout can never drift.
import { stackLayout, knollLayout } from './layout.js';

export const BURST_START = 4, INTRO_END = 8, ASM_END = 92;
const BURST_RISE = 0.35, BURST_CARRY = 0.7;   // knolling burst: rise to the stack spot, carry over the mat, set down
const LIFT = 0.2, CARRY = 0.65, CLEAR = 12;   // knolling: lift, carry over the phone, set down; clearance mm
const clamp = v => Math.max(0, Math.min(1, v));
export const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const lerp3 = (a, k) => a.map(v => v * k);

export function stepWindows(model) {
  const weights = model.steps.map(s => 1 + 0.35 * s.parts.length), total = weights.reduce((a, b) => a + b, 0), span = ASM_END - INTRO_END;
  const out = new Map(); let t = INTRO_END;
  model.steps.forEach((s, i) => { const d = span * weights[i] / total; out.set(s.n, [t, i === model.steps.length - 1 ? ASM_END : t + d]); t += d; });
  return out;
}

export const segmentAt = t => t < INTRO_END ? 'intro' : t > ASM_END ? 'finale' : 'assembly';

// How the whole phone sits at t: flip 1 = screen side up (as it is used), fold in degrees (0 open, 180 shut),
// which screen is lit, and how far the burst has gone. Foldables open/close as well as turn over.
export function screenFor(foldable, flip, fold) {
  if (!foldable) return flip > 0.9 ? 'main' : null;
  if (fold >= 150) return 'cover';
  return fold <= 120 && flip > 0.5 ? 'inner' : null;
}
export function storyPose(model, t) {
  const foldable = !!model.product.fold;
  let flip = 0, fold = 0;
  // a front-access phone is modelled screen up (it is built into its body from the screen side): it never turns
  // over, and its screen is lit at both ends
  if (!foldable && model.product.access === 'front') {
    const lit = t < BURST_START * 0.75 || t >= 98;
    return { flip: 0, fold: 0, screen: lit ? 'main' : null, burst: clamp((t - BURST_START) / (INTRO_END - BURST_START)) };
  }
  if (t < BURST_START) {
    if (foldable) { fold = 180 * (1 - ease(clamp(t / 2))); flip = 1 - ease(clamp((t - 2) / 2)); }
    else flip = 1 - ease(clamp(t / BURST_START));
  } else if (t > ASM_END) {
    if (foldable) { flip = ease(clamp((t - ASM_END) / 2.5)); fold = 180 * ease(clamp((t - ASM_END - 2.5) / 4.5)); }
    else flip = ease(clamp((t - ASM_END) / 6));
  }
  const burst = clamp((t - BURST_START) / (INTRO_END - BURST_START));
  return { flip, fold, screen: screenFor(foldable, flip, fold), burst };
}

export function createTimeline(model, layout = 'stack') {
  const stack = stackLayout(model), starts = layout === 'knoll' ? knollLayout(model) : stack;
  const windows = stepWindows(model), stepOf = new Map(model.steps.map(s => [s.n, s]));
  const { l } = model.product.dims, clearTop = Math.max(...model.parts.map(p => p.bbox[5])) + CLEAR;
  const info = new Map(), byId = new Map(model.parts.map(p => [p.id, p]));
  // on the mat, each part crosses over the phone at its own height band, stacked in the order the parts lie in the
  // exploded stack: rising keeps that order, and no two parts ever travel sideways at the same height
  const band = new Map();
  if (layout === 'knoll') {
    let h = clearTop;
    for (const p of model.parts.filter(q => q.attachedTo != null).sort((a, b) => (a.bbox[2] + stack.get(a.id).pos[2]) - (b.bbox[2] + stack.get(b.id).pos[2]))) {
      band.set(p.id, h - p.bbox[2]); h += p.bbox[5] - p.bbox[2] + 1.5; }
  }
  for (const s of model.steps) {
    const [a, b] = windows.get(s.n), n = s.parts.length, span = b - a;
    const stag = n > 1 ? Math.min(0.12 * span, span * 0.5 / (n - 1)) : 0, dur = span - stag * (n - 1);
    s.parts.forEach((id, i) => info.set(id, { a: a + i * stag, b: a + i * stag + dur, step: s, path: byId.get(id)?.path || s.path }));
  }

  // a sliding part (a SIM tray, a stylus) comes in from the edge it is pushed through: part.slideFrom 'y0' (default,
  // the charging-port end), 'y1', 'x0' or 'x1'. It waits just clear of that edge, however long it is.
  const { w } = model.product.dims, EDGE = 4;
  const slideSide = id => { const p = byId.get(id), b = p?.bbox || [0, 0, 0, w, l, 0];
    return ({ y0: [0, -(b[4] + EDGE), 0], y1: [0, l - b[1] + EDGE, 0], x0: [-(b[3] + EDGE), 0, 0], x1: [w - b[0] + EDGE, 0, 0] })[p?.slideFrom || 'y0']; };

  // the last leg into the seat, from `from` (an offset) to home, in the part's own way of going in
  function finish(path, k, from, id) {
    let pos, rot = [0, 0, 0];
    if (path === 'screw') {
      const travel = ease(clamp(k / 0.6)), spin = ease(clamp((k - 0.6) / 0.4)), seat = 1.5;
      const at = from.map((v, j) => v * (1 - travel) + (j === 2 ? seat * travel : 0));
      pos = [at[0], at[1], at[2] - seat * spin * (k > 0.6 ? 1 : 0)];
      rot = [0, 0, (1 - spin) * 6 * Math.PI];
    } else if (path === 'slide') {
      // across at its height to beside the edge, down to its seat height there, then in: never over the phone on the way down
      const side = slideSide(id), above = [side[0], side[1], from[2]];
      const p1 = ease(clamp(k / 0.35)), p2 = ease(clamp((k - 0.35) / 0.25)), p3 = ease(clamp((k - 0.6) / 0.4));
      pos = k < 0.35 ? from.map((v, j) => v + (above[j] - v) * p1) : k < 0.6 ? above.map((v, j) => v + (side[j] - v) * p2) : side.map(v => v * (1 - p3));
    } else {
      const p = ease(k);
      pos = lerp3(from, 1 - p);
      // a press-fit seats with a small rebound above the seat, never below it
      if (path === 'press') pos[2] += 0.5 * Math.sin(Math.PI * clamp((k - 0.8) / 0.2));
      if (path === 'fold') rot = [(1 - p) * -Math.PI / 2, 0, 0];
    }
    return { pos, rot };
  }

  const ZERO = () => ({ pos: [0, 0, 0], rot: [0, 0, 0] });
  // the burst: everything leaves together. Straight up to the stack spot; on the mat, it then crosses over at that
  // height (each step has its own height band, so paths don't cross) and comes down onto its spot.
  function burstPose(id, u) {
    const st = starts.get(id) || ZERO(), sk = stack.get(id) || ZERO();
    if (layout !== 'knoll') return { pos: st.pos.map(v => v * ease(u)), rot: [0, 0, 0] };
    const hz = band.get(id) ?? sk.pos[2];
    if (u < BURST_RISE) return { pos: [0, 0, hz * ease(u / BURST_RISE)], rot: [0, 0, 0] };
    if (u < BURST_CARRY) { const k = ease((u - BURST_RISE) / (BURST_CARRY - BURST_RISE)); return { pos: [st.pos[0] * k, st.pos[1] * k, hz], rot: [0, 0, 0] }; }
    const k = ease((u - BURST_CARRY) / (1 - BURST_CARRY));
    return { pos: [st.pos[0], st.pos[1], hz + (st.pos[2] - hz) * k], rot: [0, 0, 0] };
  }

  function pose(id, t) {
    const inf = info.get(id), st = starts.get(id) || { pos: [0, 0, 0], rot: [0, 0, 0] };
    if (!inf) return { pos: [0, 0, 0], rot: [0, 0, 0], progress: 1, active: false };
    const tidy = v => (Math.abs(v) < 1e-12 ? 0 : v);
    if (t <= BURST_START) return { pos: [0, 0, 0], rot: [0, 0, 0], progress: 1, active: false };
    if (t < INTRO_END) { const b = burstPose(id, (t - BURST_START) / (INTRO_END - BURST_START));
      return { pos: b.pos.map(tidy), rot: b.rot, progress: 0, active: false, burst: true }; }
    const local = clamp((t - inf.a) / (inf.b - inf.a)), path = inf.path;
    const active = t > inf.a && t < inf.b && Math.hypot(...st.pos) > 0;
    let pos, rot;
    if (local <= 0) { pos = [...st.pos]; rot = [...st.rot]; }
    else if (local >= 1) { pos = [0, 0, 0]; rot = [0, 0, 0]; }
    else if (layout === 'knoll' && (st.heads || Math.hypot(st.pos[0], st.pos[1]) > 0)) {
      // pick it up, carry it high over the phone, then set it straight down like the stack does
      const zc = band.get(id) ?? clearTop - byId.get(id).bbox[2];
      if (local < LIFT) { pos = [st.pos[0], st.pos[1], st.pos[2] + (zc - st.pos[2]) * ease(local / LIFT)]; rot = [0, 0, 0]; }
      else if (local < CARRY) { const k = ease((local - LIFT) / (CARRY - LIFT)); pos = [st.pos[0] * (1 - k), st.pos[1] * (1 - k), zc]; rot = [0, 0, 0]; }
      else ({ pos, rot } = finish(path, (local - CARRY) / (1 - CARRY), [0, 0, zc], id));
    } else ({ pos, rot } = finish(path, local, st.pos, id));
    return { pos: pos.map(v => (Math.abs(v) < 1e-12 ? 0 : v)), rot: rot.map(v => (Math.abs(v) < 1e-12 ? 0 : v)), progress: local, active };
  }

  // screws on the mat: how far each head still is from its hole, in xy (null when the layout keeps heads in place)
  function headOffsets(id, t) {
    const st = starts.get(id), part = byId.get(id), inf = info.get(id);
    if (!st?.heads || !inf) return null;
    let k;
    if (t <= BURST_START) k = 0;
    else if (t < INTRO_END) k = ease(clamp(((t - BURST_START) / (INTRO_END - BURST_START) - BURST_RISE) / (BURST_CARRY - BURST_RISE)));
    else k = 1 - ease(clamp((clamp((t - inf.a) / (inf.b - inf.a)) - LIFT) / (CARRY - LIFT)));
    return part.shape.positions.map(([x, y], i) => [(st.heads[i][0] - x) * k, (st.heads[i][1] - y) * k]);
  }

  return {
    layout, windows, headOffsets,
    start: id => starts.get(id) || { pos: [0, 0, 0], rot: [0, 0, 0] },
    window: id => [info.get(id).a, info.get(id).b],
    pose,
    // the step being worked on at t; a step's own end still counts as that step. None in the intro or finale.
    stepAt: t => { if (t < INTRO_END || t > ASM_END) return null; for (const s of model.steps) { const [, b] = windows.get(s.n); if (t <= b) return s; } return null; },
    stepIndexAt: t => { if (t < INTRO_END) return -1; if (t > ASM_END) return model.steps.length; const i = model.steps.findIndex(s => t <= windows.get(s.n)[1]); return i < 0 ? model.steps.length : i; },
    segment: segmentAt,
    stepOf,
  };
}
