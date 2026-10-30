import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeModel } from 'unfold/model.js';
import { stackLayout, knollLayout } from 'unfold/layout.js';
import { stepWindows, createTimeline, storyPose, INTRO_END, ASM_END } from 'unfold/timeline.js';

const mini = () => normalizeModel(JSON.parse(readFileSync(new URL('./fixtures/mini.json', import.meta.url))));
const near = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('windows cover 8..92 in order, no gaps', () => {
  const m = mini(), w = stepWindows(m), list = m.steps.map(s => w.get(s.n));
  assert.equal(INTRO_END, 8); assert.equal(ASM_END, 92);
  assert.equal(list[0][0], 8);
  assert.ok(Math.abs(list.at(-1)[1] - ASM_END) < 1e-9);
  for (let i = 1; i < list.length; i++) assert.ok(Math.abs(list[i][0] - list[i - 1][1]) < 1e-9);
  for (const [a, b] of list) assert.ok(b > a);
});

test('pure and endpoints', () => {
  for (const layout of ['stack', 'knoll']) {
    const m = mini(), tl = createTimeline(m, layout);
    for (const p of m.parts) {
      const start = tl.start(p.id);
      assert.ok(near(tl.pose(p.id, INTRO_END).pos, start.pos), `${layout} ${p.id} is at its layout spot when assembly starts`);
      assert.ok(near(tl.pose(p.id, 0).pos, [0, 0, 0]), `${layout} ${p.id} is assembled at 0`);
      assert.ok(near(tl.pose(p.id, 100).pos, [0, 0, 0]), `${layout} ${p.id} ends home`);
      assert.ok(near(tl.pose(p.id, 100).rot, [0, 0, 0]));
      for (const t of [13.7, 50, 88.2]) assert.deepEqual(tl.pose(p.id, t), tl.pose(p.id, t));
    }
  }
});

test('knoll footprints do not overlap', () => {
  const m = mini(), k = knollLayout(m), rects = [];
  for (const p of m.parts) rects.push([...k.get(p.id).fp, p.id, p.step]);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a[4] === 'housing' && b[4] === 'housing') continue;
    const overlap = a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    assert.ok(!overlap, `${a[4]} overlaps ${b[4]} on the mat`);
  }
  for (const p of m.parts) if (p.attachedTo != null) assert.ok(Math.abs(k.get(p.id).pos[2] + p.bbox[2]) < 1e-9, `${p.id} lies on the table`);
});

test('stack start is above the assembled top', () => {
  const m = mini(), s = stackLayout(m), top = Math.max(...m.parts.map(p => p.bbox[5]));
  for (const p of m.parts) {
    if (p.attachedTo == null) { assert.ok(near(s.get(p.id).pos, [0, 0, 0]), 'only the base waits in place'); continue; }
    assert.ok(p.bbox[2] + s.get(p.id).pos[2] > top, `${p.id} floats above the phone`);
  }
});

test('screw spins only in the last 40%', () => {
  const m = mini();
  m.steps.find(s => s.parts.includes('screws')).path = 'screw';
  const tl = createTimeline(m, 'stack'), [a, b] = tl.window('screws');
  const at = f => tl.pose('screws', a + (b - a) * f);
  assert.equal(at(0.3).rot[2], at(0.5).rot[2], 'no spin while it travels');
  assert.notEqual(at(0.7).rot[2], at(0.9).rot[2], 'spins while it drives in');
});

test('finale flips and lights the screen', () => {
  const m = mini();
  assert.deepEqual(storyPose(m, 50), { flip: 0, fold: 0, screen: null, burst: 1 });
  assert.equal(storyPose(m, 100).flip, 1);
  assert.equal(storyPose(m, 100).screen, 'main');
  assert.ok(storyPose(m, 95).flip > 0 && storyPose(m, 95).flip < 1);
});

test('screws gather in a row on the mat and return to their holes', () => {
  const m = mini(), tl = createTimeline(m, 'knoll'), k = knollLayout(m).get('screws');
  assert.equal(k.heads.length, 2);
  assert.equal(k.heads[0][1], k.heads[1][1], 'one row');
  const at0 = tl.headOffsets('screws', INTRO_END), pos = m.parts.find(p => p.id === 'screws').shape.positions;
  assert.ok(near(at0[0], [k.heads[0][0] - pos[0][0], k.heads[0][1] - pos[0][1]]));
  assert.ok(tl.headOffsets('screws', 100).every(o => near(o, [0, 0])));
  assert.ok(tl.headOffsets('screws', 0).every(o => near(o, [0, 0])), 'in their holes while the phone is whole');
  assert.equal(createTimeline(m, 'stack').headOffsets('screws', 20), null);
});

test('a step end still belongs to that step', () => {
  const m = mini(), tl = createTimeline(m, 'stack'), w = stepWindows(m);
  assert.equal(tl.stepAt(w.get(2)[1]).n, 2);
  assert.equal(tl.stepAt(w.get(2)[1] + 0.01).n, 3);
  assert.equal(tl.stepAt(ASM_END).n, 3);
  assert.equal(tl.stepAt(ASM_END + 0.1), null);
  assert.equal(tl.stepAt(INTRO_END - 0.1), null);
  assert.equal(tl.stepIndexAt(INTRO_END), 0);
});

test('a long sliding part (a stylus) only comes down beside the phone, never over it', () => {
  const m = mini(), { w, l, t } = m.product.dims;
  const last = m.steps.at(-1);
  const pen = { ...m.parts.find(p => p.id === last.parts[0]), id: 'pen', bbox: [w - 6, 4, 1, w - 2, l * 0.7, t - 1], path: 'slide', slideFrom: 'y0', attachedTo: m.parts.find(p => !p.attachedTo).id, key: false };
  m.parts.push(pen); last.parts.push('pen');
  const tl = createTimeline(m, 'stack'), [a, b] = stepWindows(m).get(last.n);
  for (let i = 0; i <= 200; i++) {
    const { pos } = tl.pose('pen', a + (b - a) * i / 200);
    const y1 = pen.bbox[4] + pos[1], z0 = pen.bbox[2] + pos[2];
    // while it is still lower than the top of the phone, it must be wholly past the y0 edge or sliding straight in
    if (z0 < t && y1 > 0) assert.ok(Math.abs(pos[0]) < 1e-9 && Math.abs(pos[2]) < 1e-6, `pen over the phone at k=${i / 200}: ${pos}`);
  }
  assert.ok(near(tl.pose('pen', b).pos, [0, 0, 0], 1e-6));
});
