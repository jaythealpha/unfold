// Where every part waits at t = 0. Pure. Offsets are in model mm, relative to the part's assembled spot.

export const isBase = p => p.attachedTo == null;
const overlapsXY = (a, b, pad = 0) => a[0] < b[3] + pad && b[0] < a[3] + pad && a[1] < b[4] + pad && b[1] < a[4] + pad;

// Exploded stack: each step floats on its own level above the assembled phone, later steps higher.
// Parts of one step that would collide on their level are lifted a little further, in z order.
export function stackLayout(model, { gap } = {}) {
  const steps = model.steps, top = Math.max(...model.parts.map(p => p.bbox[5]));
  gap = gap ?? Math.max(8, Math.min(18, 150 / Math.max(1, steps.length - 1)));
  const out = new Map(), byId = new Map(model.parts.map(p => [p.id, p]));
  let level = top + gap;
  steps.forEach(s => {
    const all = s.parts.map(id => byId.get(id)).filter(Boolean);
    // only the base (the one part fixed to nothing) waits in place; everything else floats on its step's level
    for (const p of all.filter(isBase)) out.set(p.id, { pos: [0, 0, 0], rot: [0, 0, 0] });
    const parts = all.filter(p => !isBase(p)).sort((a, b) => a.bbox[2] - b.bbox[2]);
    if (!parts.length) return;
    const placed = [];   // [bbox at its floating height]
    let levelTop = level;
    for (const p of parts) {
      const b = p.bbox, h = b[5] - b[2];
      let bottom = level;
      for (let guard = 0; guard < 50; guard++) {
        const hit = placed.find(q => overlapsXY(b, q, 0.5) && bottom < q[5] && q[2] < bottom + h);
        if (!hit) break;
        bottom = hit[5] + gap / 3;
      }
      placed.push([b[0], b[1], bottom, b[3], b[4], bottom + h]);
      levelTop = Math.max(levelTop, bottom + h);
      out.set(p.id, { pos: [0, 0, bottom - b[2]], rot: [0, 0, 0] });
    }
    level = levelTop + gap;
  });
  return out;
}

// Knolling: the base stays home; everything else lies flat on the table beside the phone, packed in rows
// (in step order) into a roughly square block. Screws leave their spread-out holes and sit in a tidy row.
// Each entry has the footprint it takes on the mat (fp) and, for screws, where each head sits (heads).
export function knollLayout(model, { margin = 8 } = {}) {
  const { w, l } = model.product.dims, out = new Map();
  const stepPos = new Map(model.steps.flatMap(s => s.parts.map((id, i) => [id, s.n * 1000 + i])));
  const order = [...model.parts].sort((a, b) => (stepPos.get(a.id) ?? 0) - (stepPos.get(b.id) ?? 0));
  const size = p => { const b = p.bbox, s = p.shape || {};
    if (s.template === 'screw' && s.positions?.length) { const c = (s.head ?? 2) + 1.5; return [c * s.positions.length, c]; }
    return [b[3] - b[0], b[4] - b[1]]; };
  const loose = order.filter(p => !isBase(p));
  const area = loose.reduce((a, p) => { const [fw, fl] = size(p); return a + (fw + margin) * (fl + margin); }, 0);
  const rowW = Math.max(l * 1.1, Math.sqrt(area * 1.15), ...loose.map(p => size(p)[0]));
  const x0 = w + margin * 2.5;
  let cx = x0, cy = 0, rowH = 0;
  for (const p of order) {
    const b = p.bbox;
    if (isBase(p)) { out.set(p.id, { pos: [0, 0, 0], rot: [0, 0, 0], fp: [b[0], b[1], b[3], b[4]] }); continue; }
    const [fw, fl] = size(p);
    if (cx > x0 && cx + fw > x0 + rowW) { cx = x0; cy += rowH + margin; rowH = 0; }
    const fp = [cx, cy, cx + fw, cy + fl], s = p.shape || {};
    if (s.template === 'screw' && s.positions?.length) {
      const c = (s.head ?? 2) + 1.5;
      out.set(p.id, { pos: [0, 0, -b[2]], rot: [0, 0, 0], fp, heads: s.positions.map((_, i) => [cx + c * (i + 0.5), cy + c / 2]) });
    } else out.set(p.id, { pos: [cx - b[0], cy - b[1], -b[2]], rot: [0, 0, 0], fp });
    cx += fw + margin; rowH = Math.max(rowH, fl);
  }
  return out;
}
