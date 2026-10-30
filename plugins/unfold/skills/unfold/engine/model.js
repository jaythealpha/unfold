// Assembly model: normalization and validation. Pure (no DOM, no three.js), shared by the page and Gate 1.
// Coordinates are mm with the phone screen-down: x = width, y = length (0 = USB-C end), z = thickness
// (0 = front glass, + toward the back). Assembly happens in +z.

export const WARN_SHARE = 0.5;          // below this share of verified parts the page shows a warning band
export const DIM_TOL = 0.5;             // mm, official outer dimensions vs the model
export const BUMP_MAX = 6;              // mm a camera bump may stand out beyond 0..t (either face)
export const TEMPLATES = ['box', 'plate', 'display', 'flexdisplay', 'hinge', 'housing', 'ring', 'pcb', 'battery', 'shield', 'screw', 'connector',
  'flex', 'camera', 'coil', 'speaker', 'motor', 'button', 'port', 'adhesive'];
export const PATHS = ['drop', 'screw', 'press', 'slide', 'fold'];
export const PART_RANGE = { phone: [40, 80], foldable: [50, 100] };
export const FASTENINGS = ['screw', 'adhesive', 'press-connector', 'clip', 'solder', 'integral', 'magnet', 'friction', 'tape'];
export const KEY_RANGE = [6, 8];

// a field that may come as a plain string, as {ko, en}, or as research-style name_ko / name_en
const bi = (obj, key) => {
  const v = obj[key];
  if (v && typeof v === 'object') return { ko: v.ko ?? v.en ?? '', en: v.en ?? v.ko ?? '' };
  if (typeof v === 'string') return { ko: v, en: v };
  const ko = obj[key + '_ko'], en = obj[key + '_en'];
  if (ko == null && en == null) return null;
  return { ko: ko ?? en, en: en ?? ko };
};

export function normalizeModel(raw) {
  const product = { kind: raw.product?.fold ? 'foldable' : 'phone', ...raw.product };
  product.name = typeof product.name === 'object' ? product.name : { ko: product.name ?? '', en: product.name ?? '' };
  const parts = (raw.parts || []).map(p => ({
    ...p,
    name: bi(p, 'name') || { ko: p.id, en: p.id },
    desc: bi(p, 'desc'),
    count: p.count ?? (p.shape?.positions?.length || 1),
    shape: { template: 'box', ...(p.shape || {}) },
    attachedTo: p.attachedTo ?? null,
    fastening: p.fastening ?? null,
    sourceIds: p.sourceIds ?? [],
    confidence: p.confidence === 'verified' ? 'verified' : 'estimated',
    key: !!p.key,
    passesThrough: p.passesThrough ?? [],
  }));
  const steps = (raw.steps || []).map(s => ({
    ...s,
    title: bi(s, 'title') || { ko: `${s.n}`, en: `${s.n}` },
    cautions: bi(s, 'cautions'),
    tools: bi(s, 'tools'),
    parts: s.parts || [],
    path: s.path || 'drop',
    sourceIds: s.sourceIds ?? [],
  })).sort((a, b) => a.n - b.n);
  const meta = { limitations: [], gate2: 'unknown', ...(raw.meta || {}) };
  return { product, sources: raw.sources || [], parts, steps, meta };
}

export function verifiedShare(model) {
  if (!model.parts.length) return 0;
  return model.parts.filter(p => p.confidence === 'verified').length / model.parts.length;
}

export function validateModel(model, { officialDims } = {}) {
  const errors = [], warnings = [];
  const err = (part, field, msg) => errors.push({ part, field, msg });
  const warn = (part, field, msg) => warnings.push({ part, field, msg });
  const ids = new Map(), srcIds = new Set(model.sources.map(s => s.id));
  const { w, l, t } = model.product.dims || {};
  if (![w, l, t].every(v => typeof v === 'number' && isFinite(v) && v > 0)) {
    err('product', 'product.dims', 'product.dims needs positive numbers w, l and t (mm)');
    return { errors, warnings };
  }
  const f = model.product.fold;
  if (f) {
    const span = f.axis === 'x' ? l : w;
    if (!(f.axis === 'x' || f.axis === 'y' || f.axis == null)) err('product', 'product.fold', 'fold.axis is "y" (book fold) or "x" (clamshell)');
    if (!(f.at > 0 && f.at < span)) err('product', 'product.fold', `fold.at must lie inside the phone (0 < at < ${span})`);
    if (typeof f.at !== 'number' || !isFinite(f.at)) err('product', 'product.fold', 'fold.at must be a number (mm)');
    if (!(typeof f.gap === 'number' && f.gap > 0 && f.gap < 10)) err('product', 'product.fold', 'fold.gap is the gap between the shut halves in mm (0 < gap < 10)');
    if (f.spine != null && !(typeof f.spine === 'number' && f.spine >= 0 && f.spine <= 4)) err('product', 'product.fold', 'fold.spine is how far the shut spine stands out, 0–4 mm');
    if (f.b != null && f.b !== '+' && f.b !== '-') err('product', 'product.fold', 'fold.b is "+" (half B on the high side) or "-"');
    // the screens must sit where the story expects them
    const fiv = { axis: f.axis === 'x' ? 'x' : 'y', at: f.at, bSign: f.b === '-' ? -1 : 1 };
    const sideOf = p => p.half ?? (() => { const b = p.bbox, lo = fiv.axis === 'x' ? b[1] : b[0], hi = fiv.axis === 'x' ? b[4] : b[3];
      return lo < f.at - 2 && hi > f.at + 2 ? 'hinge' : ((lo + hi) / 2 - f.at) * fiv.bSign > 0 ? 'b' : 'a'; })();
    for (const p of model.parts) {
      if (p.shape.template === 'display' && p.shape.face === 'back' && sideOf(p) !== 'b') err(p.id, 'half', 'the cover screen (face "back") must be on half B; check fold.b');
      if (p.shape.template === 'flexdisplay' && sideOf(p) !== 'hinge') err(p.id, 'half', 'the folding screen must lie across the fold line (half "hinge")');
      if (p.half === 'hinge' && Array.isArray(p.bbox)) { const lo = fiv.axis === 'x' ? p.bbox[1] : p.bbox[0], hi = fiv.axis === 'x' ? p.bbox[4] : p.bbox[3];
        if (!(lo < f.at && hi > f.at)) warn(p.id, 'half', 'marked "hinge" but does not cross the fold line; give it half "a" or "b" so it rides with its side'); }
    }
    const fd = model.product.foldedDims;
    if (fd && ![fd.w, fd.l, fd.t].every(v => typeof v === 'number' && v > 0)) err('product', 'product.foldedDims', 'foldedDims needs positive w, l, t');
    if (!fd) warn('product', 'product.foldedDims', 'give the official folded size in product.foldedDims');
    for (const p of model.parts) if (p.half != null && !['a', 'b', 'hinge'].includes(p.half)) err(p.id, 'half', 'half is "a", "b" or "hinge"');
  }
  if (model.product.access != null && !['front', 'back'].includes(model.product.access)) err('product', 'product.access', 'access is "back" (built from the back onto the screen) or "front" (built into the body from the screen side)');
  if (model.product.access === 'front' && f) err('product', 'product.access', 'a foldable is modelled open with the inner screen down; leave access out');
  if (model.steps.length < 2) err('steps', 'steps', `a model needs at least 2 steps (it has ${model.steps.length})`);
  const bases = model.parts.filter(p => p.attachedTo == null);
  if (bases.length !== 1) err('parts', 'attachedTo', `exactly one part (the base) may have no attachedTo; found ${bases.length}${bases.length ? ': ' + bases.map(p => p.id).join(', ') : ''}`);

  if (officialDims) for (const k of ['w', 'l', 't']) {
    const a = model.product.dims?.[k], b = officialDims[k];
    if (b != null && (a == null || Math.abs(a - b) > DIM_TOL))
      err('product', 'product.dims', `${k} = ${a} mm, official ${b} mm (allowed ±${DIM_TOL} mm)`);
  }

  for (const p of model.parts) {
    if (ids.has(p.id)) err(p.id, 'id', 'duplicate part id');
    ids.set(p.id, p);
  }
  for (const p of model.parts) {
    const b = p.bbox;
    if (!Array.isArray(b) || b.length !== 6 || b.some(v => typeof v !== 'number' || !isFinite(v)))
      err(p.id, 'bbox', 'bbox must be six numbers [x0,y0,z0,x1,y1,z1]');
    else if (b[0] >= b[3] || b[1] >= b[4] || b[2] >= b[5])
      err(p.id, 'bbox', 'bbox min must be below max on every axis');
    else if (w != null && (b[0] < -DIM_TOL || b[1] < -DIM_TOL || b[3] > w + DIM_TOL || b[4] > l + DIM_TOL))
      err(p.id, 'bbox', `bbox lies outside the product (${w} × ${l} mm)`);
    else if (b[2] < -BUMP_MAX || b[5] > t + BUMP_MAX)
      err(p.id, 'bbox', `bbox reaches more than ${BUMP_MAX} mm beyond the body's thickness (z 0..${t})`);
    if (!TEMPLATES.includes(p.shape.template)) err(p.id, 'shape.template', `unknown template "${p.shape.template}"`);
    if (p.path != null && !PATHS.includes(p.path)) err(p.id, 'path', `unknown path "${p.path}"`);
    if (p.slideFrom != null && !['y0', 'y1', 'x0', 'x1'].includes(p.slideFrom)) err(p.id, 'slideFrom', 'slideFrom is the edge it slides in through: y0, y1, x0 or x1');
    if (p.attachedTo != null && !ids.has(p.attachedTo)) err(p.id, 'attachedTo', `attachedTo "${p.attachedTo}" is not a part`);
    if (p.attachedTo == null && p.step !== model.steps[0]?.n) err(p.id, 'attachedTo', 'the base part (no attachedTo) must be in the first step');
    if (p.attachedTo != null) {
      const types = String(p.fastening?.type || '').split('+').filter(Boolean);
      if (!types.length) err(p.id, 'fastening', 'say how it is fixed: fastening.type');
      for (const ty of types) if (!FASTENINGS.includes(ty)) err(p.id, 'fastening', `unknown fastening "${ty}" (use ${FASTENINGS.join(', ')}, joined with + if several)`);
    }
    for (const t of p.passesThrough) if (!ids.has(t)) err(p.id, 'passesThrough', `passesThrough "${t}" is not a part`);
    for (const s of p.sourceIds) if (!srcIds.has(s)) err(p.id, 'sourceIds', `source "${s}" is not listed`);
    if (p.confidence === 'verified' && !p.sourceIds.length) err(p.id, 'sourceIds', 'a verified part needs at least one source');
    const st = model.steps.find(s => s.n === p.step);
    if (!st || !st.parts.includes(p.id)) err(p.id, 'step', `part is not listed in step ${p.step}`);
  }
  const seen = new Set();
  for (const s of model.steps) {
    if (!PATHS.includes(s.path)) err(`step ${s.n}`, 'steps.path', `unknown path "${s.path}"`);
    for (const id of s.parts) {
      if (!ids.has(id)) { err(id, 'steps.parts', `step ${s.n} lists an unknown part`); continue; }
      if (seen.has(id)) err(id, 'steps.parts', `part is listed in more than one step`);
      seen.add(id);
      if (ids.get(id).step !== s.n) err(id, 'step', `listed in step ${s.n} but its step is ${ids.get(id).step}`);
    }
  }
  // everything is assembled from above (+z), so the base should be the lowest part (usually the display, screen down)
  if (bases.length === 1 && model.parts.some(p => Array.isArray(p.bbox) && p.bbox[2] < bases[0].bbox?.[2] - 0.01 && !p.passesThrough.length))
    warn(bases[0].id, 'attachedTo', 'the base is not the lowest part: parts below it would have to come up through it (make the lowest part, e.g. the display, the base)');
  const keys = model.parts.filter(p => p.key);
  if (!keys.length) err('parts', 'key', 'mark the key parts (key: true, with desc): the simple view shows only them');
  else if (keys.length < KEY_RANGE[0] || keys.length > KEY_RANGE[1]) warn('parts', 'key', `${keys.length} key parts; ${KEY_RANGE[0]}–${KEY_RANGE[1]} read best`);
  for (const p of keys) if (!p.desc) warn(p.id, 'desc', 'a key part needs a one-line desc {ko, en}');
  const range = PART_RANGE[model.product.kind];
  if (range && (model.parts.length < range[0] || model.parts.length > range[1]))
    warn('product', 'parts', `부품 수 ${model.parts.length}개: 권장 범위 ${range[0]}–${range[1]}`);
  return { errors, warnings };
}
