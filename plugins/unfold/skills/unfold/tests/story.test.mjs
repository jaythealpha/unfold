import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeModel } from 'unfold/model.js';
import { createTimeline, storyPose, BURST_START, INTRO_END } from 'unfold/timeline.js';

const mini = () => normalizeModel(JSON.parse(readFileSync(new URL('./fixtures/mini.json', import.meta.url))));
const TS = [0, 1, 3.9, 4, 6, 7.99, 8, 50, 92, 95, 100];

test('pure across segments', () => {
  const m = mini();
  for (const layout of ['stack', 'knoll']) {
    const tl = createTimeline(m, layout);
    for (const t of TS) {
      assert.deepEqual(storyPose(m, t), storyPose(m, t));
      for (const p of m.parts) assert.deepEqual(tl.pose(p.id, t), tl.pose(p.id, t));
    }
  }
});

test('t=0 and t=100 are the finished phone', () => {
  const m = mini();
  for (const layout of ['stack', 'knoll']) {
    const tl = createTimeline(m, layout);
    for (const t of [0, 100]) for (const p of m.parts) assert.deepEqual(tl.pose(p.id, t).pos, [0, 0, 0]);
  }
  for (const t of [0, 100]) assert.deepEqual(storyPose(m, t), { flip: 1, fold: 0, screen: 'main', burst: t ? 1 : 0 });
});

test('burst rises before it spreads (knoll)', () => {
  const m = mini(), tl = createTimeline(m, 'knoll');
  for (const p of m.parts) {
    if (p.attachedTo == null) continue;
    const q = tl.pose(p.id, BURST_START + 0.5);
    assert.ok(Math.abs(q.pos[0]) + Math.abs(q.pos[1]) < 0.5, `${p.id} has not moved sideways yet`);
    assert.ok(q.pos[2] > 0, `${p.id} is rising`);
    assert.ok(Math.abs(tl.pose(p.id, INTRO_END).pos[0] - tl.start(p.id).pos[0]) < 1e-9, `${p.id} lands on its mat spot`);
  }
});

test('stepAt is null in intro and finale', () => {
  const tl = createTimeline(mini(), 'stack');
  for (const t of [0, 4, 7.9, 92.1, 100]) assert.equal(tl.stepAt(t), null);
  assert.equal(tl.segment(3), 'intro'); assert.equal(tl.segment(50), 'assembly'); assert.equal(tl.segment(95), 'finale');
});

test('foldable story: shut, open, turn over, burst; and back', () => {
  const m = mini(); m.product.fold = { axis: 'y', at: 35, gap: 2 };
  assert.deepEqual(storyPose(m, 0), { flip: 1, fold: 180, screen: 'cover', burst: 0 });
  assert.equal(storyPose(m, 2).fold, 0);
  assert.equal(storyPose(m, 2).screen, 'inner');
  assert.equal(storyPose(m, 4).flip, 0);
  assert.deepEqual(storyPose(m, 100), { flip: 1, fold: 180, screen: 'cover', burst: 1 });
  assert.ok(storyPose(m, 96).fold > 0 && storyPose(m, 96).fold < 180);
});

test('a front-access phone stays screen up and is lit at both ends', () => {
  const m = mini(); m.product.access = 'front';
  for (const t of [0, 2, 50, 95, 100]) assert.equal(storyPose(m, t).flip, 0);
  assert.equal(storyPose(m, 0).screen, 'main');
  assert.equal(storyPose(m, 100).screen, 'main');
  assert.equal(storyPose(m, 50).screen, null);
});
