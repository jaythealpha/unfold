#!/usr/bin/env node
// Gate 1: check an assembly model before anything is drawn.
//   node scripts/check_model.mjs model.json [--official w,l,t] [--official-folded w,l,t] [--json]
// Schema and references (model.js), then collisions: parts that overlap once assembled, parts that pass through
// each other in the burst or on their way in (both layouts), and, for foldables, the two halves when shut and
// the folded size. Exit 0 = pass, 1 = errors.
import { readFileSync } from 'node:fs';
import { normalizeModel, validateModel, verifiedShare } from '../engine/model.js';
import { partBoxes } from '../engine/shapes.js';
import { createTimeline, BURST_START, INTRO_END } from '../engine/timeline.js';
import { foldInfo, halfOf, foldedBox, foldedOutline } from '../engine/fold.js';

const args = process.argv.slice(2), asJson = args.includes('--json'), taken = new Set();
const dimsFlag = name => { const i = args.indexOf(name); if (i < 0) return null; taken.add(i); taken.add(i + 1);
  const v = String(args[i + 1] ?? '').split(',').map(Number);
  if (v.length !== 3 || !v.every(x => isFinite(x) && x > 0)) {
    console.log(`GATE1 FAIL errors=1 warnings=0 verified=0%\n  ERROR args · ${name}: give the size as three numbers in mm: ${name} W,L,T`); process.exit(1); }
  return { w: v[0], l: v[1], t: v[2] }; };
const official = dimsFlag('--official'), officialFolded = dimsFlag('--official-folded');
const file = args.find((a, i) => !a.startsWith('--') && !taken.has(i));
if (!file) { console.error('usage: node scripts/check_model.mjs model.json [--official w,l,t] [--official-folded w,l,t] [--json]'); process.exit(64); }

let model;
try { model = normalizeModel(JSON.parse(readFileSync(file, 'utf8'))); }
catch (e) { console.log(`GATE1 FAIL errors=1 warnings=0 verified=0%\n  model: cannot read ${file}: ${e.message}`); process.exit(1); }

const { errors, warnings } = validateModel(model, official ? { officialDims: official } : {});

// collisions ---------------------------------------------------------------------------------------------
const EPS = 0.05, FREE = new Set(['fastener', 'adhesive', 'flex']);
const byId = new Map(model.parts.map(p => [p.id, p]));
const exempt = (a, b) => a.attachedTo === b.id || b.attachedTo === a.id || FREE.has(a.category) || FREE.has(b.category)
  || a.passesThrough.includes(b.id) || b.passesThrough.includes(a.id);
const shift = (bx, o) => ({ min: bx.min.map((v, k) => v + o[k]), max: bx.max.map((v, k) => v + o[k]) });
const hit = (A, B) => { for (const a of A) for (const b of B) if ([0, 1, 2].every(k => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > EPS)) return [a, b]; return null; };
const okShape = p => Array.isArray(p.bbox) && p.bbox.length === 6 && p.bbox.every(Number.isFinite);
const fmtBox = b => `[${[...b.min, ...b.max].map(v => +v.toFixed(2)).join(', ')}]`;

const SAMPLES = 120;          // per part, across its own window on the bar
if (!errors.length) try {
  const parts = model.parts.filter(okShape), boxes = new Map(parts.map(p => [p.id, partBoxes(p)]));
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j]; if (exempt(a, b)) continue;
    const h = hit(boxes.get(a.id), boxes.get(b.id));
    if (h) errors.push({ part: a.id, field: 'collision', msg: `collision when assembled: ${a.id} ${fmtBox(h[0])} overlaps ${b.id} ${fmtBox(h[1])} (fix a bbox, or mark attachedTo / passesThrough if it really goes through)` });
  }
  // a sliding part is the usual cause when one is involved: say so, so the fix goes to the part, not the step order
  const pathOf = id => { const p = model.parts.find(q => q.id === id); return p?.path || model.steps.find(s => s.parts.includes(id))?.path; };
  const stepOf = id => model.steps.find(s => s.parts.includes(id))?.n, sameStep = (x, y) => stepOf(x) != null && stepOf(x) === stepOf(y);
  const slideHint = (...ids) => { const sl = ids.filter(id => pathOf(id) === 'slide');
    return sl.length ? ` (${sl.join(', ')} slides in from an edge: check its bbox, slideFrom and its step; keep it in the step where it really goes in)` : ''; };
  // every moving part, finely along its own way in, against every part already seated, in both layouts
  for (const layout of ['stack', 'knoll']) {
    const tl = createTimeline(model, layout), seen = new Set();
    for (const a of parts) {
      const [wa, wb] = tl.window(a.id);
      for (let k = 1; k < SAMPLES; k++) {
        const t = wa + (wb - wa) * k / SAMPLES, pa = tl.pose(a.id, t);
        const heads = tl.headOffsets(a.id, t);
        const A = boxes.get(a.id).map((bx, i) => shift(bx, heads ? [pa.pos[0] + heads[i][0], pa.pos[1] + heads[i][1], pa.pos[2]] : pa.pos));
        for (const b of parts) {
          if (b === a || exempt(a, b) || seen.has(a.id + '|' + b.id) || tl.pose(b.id, t).progress < 1) continue;
          if (hit(A, boxes.get(b.id))) { seen.add(a.id + '|' + b.id);
            errors.push({ part: a.id, field: 'path', msg: `${layout}: on its way in (t=${t.toFixed(1)}) ${a.id} passes through ${b.id}, which is already in place (move it to a later step, or fix a position)${slideHint(a.id, b.id)}` }); }
        }
      }
    }
  }
  // the burst: every part leaves at once, so check every moving pair, in both layouts
  const BURST_SAMPLES = 60;
  for (const layout of ['stack', 'knoll']) {
    const tl = createTimeline(model, layout), seen = new Set();
    for (let k = 1; k < BURST_SAMPLES; k++) {
      const t = BURST_START + (INTRO_END - BURST_START) * k / BURST_SAMPLES;
      const at = new Map(parts.map(p => { const q = tl.pose(p.id, t), h = tl.headOffsets(p.id, t);
        return [p.id, boxes.get(p.id).map((bx, i) => shift(bx, h ? [q.pos[0] + h[i][0], q.pos[1] + h[i][1], q.pos[2]] : q.pos))]; }));
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j], key = a.id + '|' + b.id; if (seen.has(key) || exempt(a, b)) continue;
        if (hit(at.get(a.id), at.get(b.id))) { seen.add(key);
          errors.push({ part: a.id, field: 'burst', msg: `${layout}: in the burst (t=${t.toFixed(2)}) ${a.id} passes through ${b.id}${sameStep(a.id, b.id) ? ' (they are in the same step, so they float out as one layer: if one rests on the other, move the covering part to the next step)' : ' (check their steps and positions)'}${slideHint(a.id, b.id)}` }); }
      }
    }
  }
  // foldables: shut, the two halves must not meet, and the folded size must match the official one
  const fi = foldInfo(model);
  if (!fi && officialFolded) errors.push({ part: 'product', field: 'product.fold', msg: '--official-folded was given but the model has no product.fold' });
  if (fi) {
    const half = new Map(parts.map(p => [p.id, halfOf(model, p, fi)]));
    for (const a of parts) for (const b of parts) {
      if (half.get(a.id) !== 'a' || half.get(b.id) !== 'b' || exempt(a, b)) continue;   // A against B, shut
      const A = boxes.get(a.id), B = boxes.get(b.id).map(bx => foldedBox(fi, bx, 'b', 180));
      const h = hit(A, B);
      if (h) errors.push({ part: b.id, field: 'fold', msg: `shut, ${b.id} (half B) runs into ${a.id} (half A): ${fmtBox(h[1])} vs ${fmtBox(h[0])} (thinner parts, a larger fold.gap, or move it)` });
    }
    const want = officialFolded || model.product.foldedDims, got = foldedOutline(model, 180);
    if (want) for (const k of ['w', 'l', 't']) if (!isFinite(got[k]) || Math.abs(got[k] - want[k]) > 0.5) {
      const hint = k === 't' ? ` (fold.gap that would give it: ${(want.t - 2 * model.product.dims.t).toFixed(2)} mm)` : k === 'w' ? ' (check fold.at and fold.gap)' : '';
      errors.push({ part: 'product', field: 'product.foldedDims', msg: `folded ${k} = ${got[k].toFixed(2)} mm, official ${want[k]} mm (±0.5)${hint}` });
    }
  }
} catch (e) { errors.push({ part: 'model', field: 'check', msg: `could not check collisions: ${e.message}` }); }

const share = verifiedShare(model), pct = Math.round(share * 100), pass = errors.length === 0;
if (asJson) {
  console.log(JSON.stringify({ pass, errors, warnings, verifiedShare: share, parts: model.parts.length, steps: model.steps.length }, null, 1));
} else {
  for (const e of errors) console.log(`  ERROR ${e.part} · ${e.field}: ${e.msg}`);
  for (const w of warnings) console.log(`  warn  ${w.part} · ${w.field}: ${w.msg}`);
  console.log(`GATE1 ${pass ? 'PASS' : 'FAIL'} errors=${errors.length} warnings=${warnings.length} verified=${pct}% parts=${model.parts.length} steps=${model.steps.length}`);
}
process.exit(pass ? 0 : 1);
