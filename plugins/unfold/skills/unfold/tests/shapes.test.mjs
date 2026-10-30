import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partBoxes } from 'unfold/shapes.js';

const inside = (b, part) => [0, 1, 2].every(k => b.min[k] <= b.max[k]
  && b.min[k] >= part.bbox[k] - 0.01 && b.max[k] <= part.bbox[k + 3] + 0.01);
const mk = (template, extra = {}) => ({ id: 'p', bbox: [0, 0, 0, 70, 146, 6], shape: { template, ...extra } });

test('housing yields 5 boxes inside bbox', () => {
  const p = mk('housing', { wall: 1.6, floor: 1.2 });
  const bs = partBoxes(p);
  assert.equal(bs.length, 5);
  assert.ok(bs.every(b => inside(b, p)));
});

test('ring yields 4 boxes', () => {
  const p = mk('ring', { wall: 2 });
  const bs = partBoxes(p);
  assert.equal(bs.length, 4);
  assert.ok(bs.every(b => inside(b, p)));
});

test('screw with 3 positions yields 3 boxes', () => {
  const p = { id: 's', bbox: [0, 0, 2, 40, 10, 4], shape: { template: 'screw', head: 2, positions: [[2, 2], [20, 5], [38, 8]] } };
  const bs = partBoxes(p);
  assert.equal(bs.length, 3);
  assert.ok(bs.every(b => inside(b, p)));
});

test('plate yields its bbox', () => {
  const p = mk('plate', { r: 9 });
  assert.deepEqual(partBoxes(p), [{ min: [0, 0, 0], max: [70, 146, 6] }]);
});
