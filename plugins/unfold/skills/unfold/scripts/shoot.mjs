#!/usr/bin/env node
// Gate 2: open a built Unfold page in headless Chrome (driven over the DevTools protocol, no npm packages),
// shoot it across the time bar, layouts, styles, depths and a real phone viewport, check each shot, and make
// a contact sheet.  node scripts/shoot.mjs page.html outDir [--quick]
// Prints GATE2 PASS | FAIL | SKIPPED.  Exit 0 pass, 1 fail, 2 skipped (no Chrome found).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openBrowser, shooter, writeSheets } from '../shared/cdp.mjs';

//   node scripts/shoot.mjs page.html outDir --only "t=0&fold=90&yaw=100&zoom=3" [--only ...] [--scale 2]
// shoots just those views (no gate checks), for a close look at one spot.
const args = process.argv.slice(2), quick = args.includes('--quick');
const only = [], taken = new Set(); let scale = 1;
args.forEach((a, i) => { if (a === '--only') { only.push(args[i + 1] ?? ''); taken.add(i + 1); } if (a === '--scale') { scale = Math.max(1, Math.min(4, +args[i + 1] || 1)); taken.add(i + 1); } });
const [page, outDir] = args.filter((a, i) => !a.startsWith('--') && !taken.has(i));
if (!page || !outDir) { console.error('usage: node scripts/shoot.mjs page.html outDir [--quick]'); process.exit(64); }

mkdirSync(outDir, { recursive: true });
const B = await openBrowser({ tag: 'unfold' });
const { S, evaluate, nextLoad, sleep, cleanup, bail } = B;
try {
const base = pathToFileURL(resolve(page)).href;
const CHECK = `(async () => {
  for (let i = 0; i < 80 && !(window.__unfold && (window.__unfold.ready || window.__unfold.errors.length)); i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); await new Promise(r => setTimeout(r, 350));
  const u = window.__unfold || { errors: ['no __unfold'] }, out = { errors: [...(u.errors || [])], problems: [] };
  if (!u.ready) out.problems.push('page did not finish starting');
  if (document.documentElement.scrollWidth > innerWidth + 1) out.problems.push('horizontal scroll: ' + document.documentElement.scrollWidth + ' > ' + innerWidth);
  const cv = document.querySelector('.uf-stage canvas');
  if (cv) { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.drawImage(cv, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data, seen = new Set(); for (let i = 0; i < d.length; i += 4) seen.add(d[i] >> 4 << 8 | d[i+1] >> 4 << 4 | d[i+2] >> 4);
    if (seen.size < 6) out.problems.push('canvas looks blank (' + seen.size + ' colours)'); }
  const stage = document.querySelector('.uf-stage')?.getBoundingClientRect();
  for (const el of document.querySelectorAll('.uf-pill, .uf-ball, .uf-stepcard:not([hidden]), .uf-pop:not([hidden])')) { const r = el.getBoundingClientRect();
    if (stage && (r.left < stage.left - 1 || r.right > stage.right + 1 || r.top < stage.top - 1 || r.bottom > stage.bottom + 1)) out.problems.push('outside the stage: ' + el.className + ' "' + el.textContent.slice(0, 30) + '"'); }
  for (const el of document.querySelectorAll('.uf-stepcard h3, .uf-stepcard li, .uf-bom td, .uf-pop h4, .uf-now')) {
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).textOverflow !== 'ellipsis') out.problems.push('text overflows: "' + el.textContent.slice(0, 30) + '"'); }
  out.steps = u.model ? u.model.steps.length : 0;
  return out; })()`;

const { shot, shots } = shooter({ ...B, base, outDir, check: CHECK, scale });

if (only.length) {
  for (const q of only) { const name = 'view-' + q.replace(/[^a-z0-9]+/gi, '_').slice(0, 60); await shot(name, Object.fromEntries(new URLSearchParams(q))); console.log(`view: ${join(outDir, name + '.png')}`); }
  await cleanup(); process.exit(0);
}
const first = await shot('detail-stack-color-t40', { t: 40 });
const nSteps = first.steps || 1;
const ts = quick ? [0, 50, 100] : [0, 25, 50, 75, 100];
for (const layout of ['stack', 'knoll']) for (const style of ['color', 'blueprint']) for (const t of ts) await shot(`${layout}-${style}-t${t}`, { t, layout, style, auto: 0 });
for (const yaw of quick ? [215] : [125, 215, 300]) await shot(`angle-yaw${yaw}-t30`, { t: 30, yaw, pitch: 28 });
await shot('angle-low-t60', { t: 60, yaw: 60, pitch: 8 });
// the opening and closing scenes
for (const t of [2, 4, 6, 94, 95, 97]) await shot(`story-t${t}`, { t });
// the finished phone at both ends must show a lit screen (a model built the wrong way round shows its back)
for (const t of [0, 100]) {
  await shot(`lit-t${t}`, { t, auto: 0 });
  const lit = await evaluate('window.__unfold.R.state.litScreens || 0');
  console.log(`${lit ? 'ok  ' : 'FAIL'} lit-t${t}  ${lit} lit screen(s)`);
  if (!lit) shots.push({ name: `lit-t${t}-screen`, file: `lit-t${t}.png`, errors: [], problems: ['no screen is lit on the finished phone (is the model built the right way round? see product.access)'] });
}
const foldable = await evaluate('!!window.__unfold?.R?.foldable');
const expectState = async (name, fold, screen) => { const st = await evaluate('({ fold: window.__unfold.R.state.story?.fold, screen: window.__unfold.R.state.story?.screen })');
  const ok = Math.abs(st.fold - fold) < 0.5 && st.screen === screen;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}-state  fold=${st.fold} screen=${st.screen} (expected ${fold}, ${screen})`);
  if (!ok) shots.push({ name: name + '-state', file: name + '.png', errors: [], problems: ['fold or lit screen not as expected'] }); };
if (foldable) {
  await shot('fold-90-at-100', { t: 100, fold: 90 }); await expectState('fold-90-at-100', 90, 'inner');
  await shot('fold-0-at-0', { t: 0, fold: 0 }); await expectState('fold-0-at-0', 0, 'inner');
  await shot('fold-135-blueprint', { t: 100, fold: 135, style: 'blueprint' }); await expectState('fold-135-blueprint', 135, null);
  await shot('fold-ignored-mid-bar', { t: 50, fold: 90 }); await expectState('fold-ignored-mid-bar', 0, null);
  await shot('shut-at-100', { t: 100 }); await expectState('shut-at-100', 180, 'cover');
}
await shot('simple-t20', { depth: 'simple', t: 20 });
const pickN = quick ? 3 : 6;
for (let k = 1; k <= pickN; k++) { const s = Math.max(1, Math.round(k * nSteps / pickN)); await shot(`manual-step${s}`, { depth: 'manual', step: s }); }
await shot('manual-color-knoll-step2', { depth: 'manual', step: Math.min(2, nSteps), style: 'color', layout: 'knoll' });
await shot('sources-panel', { t: 100, panel: 'sources' });
await shot('lang-en-t50', { t: 50, lang: 'en' });
await shot('mobile-detail-t40', { t: 40 }, { w: 375, h: 812, mobile: true });
await shot('mobile-manual-step3', { depth: 'manual', step: Math.min(3, nSteps) }, { w: 375, h: 812, mobile: true });
await shot('mobile-knoll-t15', { t: 15, layout: 'knoll' }, { w: 375, h: 812, mobile: true });

// playback speed: each speed covers the whole bar in its own time (1× 60 s, 2× 30 s, 3× 20 s, 5× 12 s)
for (const [speed, secs] of quick ? [['slow', 30]] : [['xslow', 60], ['slow', 30], ['normal', 20], ['fast', 12]]) {
  await shot(`speed-${speed}`, { t: 10, speed, play: 1, auto: 0 });
  const moved = await evaluate(`(async () => { const t0 = window.__unfold.st.t, p0 = performance.now(); await new Promise(r => setTimeout(r, 2000));
    return { dt: window.__unfold.st.t - t0, secs: (performance.now() - p0) / 1000 }; })()`);
  const expect = moved.secs * 100 / secs, sOk = Math.abs(moved.dt - expect) < Math.max(2, expect * 0.3);
  console.log(`${sOk ? 'ok  ' : 'FAIL'} speed-${speed}  moved ${moved.dt.toFixed(1)} in ${moved.secs.toFixed(1)} s (expected ~${expect.toFixed(1)})`);
  if (!sOk) shots.push({ name: `speed-${speed}-rate`, file: `speed-${speed}.png`, errors: [], problems: ['playback speed is off'] });
}

// the printed manual: one page per step plus the cover and the sources (print() itself is stubbed)
await shot('print-check', { t: 50 });
const manual = await evaluate(`(async () => { window.print = () => {}; document.querySelector('[data-a=print]').click();
  await new Promise(r => setTimeout(r, 300)); const secs = document.querySelectorAll('.uf-print section');
  return { sections: secs.length, images: [...document.querySelectorAll('.uf-print img')].filter(i => i.src.startsWith('data:image/png') && i.src.length > 5000).length,
    steps: window.__unfold.model.steps.length, errors: window.__unfold.errors.length }; })()`);
const mOk = manual.sections === manual.steps + 2 && manual.images === manual.steps + 1 && !manual.errors;
console.log(`${mOk ? 'ok  ' : 'FAIL'} print-manual  sections=${manual.sections} images=${manual.images} steps=${manual.steps}`);
if (!mOk) shots.push({ name: 'print-manual', file: 'print-check.png', errors: [], problems: ['printed manual is incomplete'] });
// pictures of the printed pages themselves (print media): the first step and a middle one, so they can be read in key.png
await S('Emulation.setEmulatedMedia', { media: 'print' });
await S('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });
for (const i of [...new Set([1, Math.max(1, Math.ceil(manual.steps / 2))])]) {
  const r = await evaluate(`(() => { const s = document.querySelectorAll('.uf-print section')[${i}]; if (!s) return null; const b = s.getBoundingClientRect();
    return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: Math.min(b.height, 1123) }; })()`);
  if (!r) continue;
  const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
  writeFileSync(join(outDir, `print-step${i}.png`), Buffer.from(data, 'base64'));
  shots.push({ name: `print-step${i}`, file: `print-step${i}.png`, errors: [], problems: [] });
}
await S('Emulation.setEmulatedMedia', { media: '' });

// contact sheet and the shots worth reading closely
await writeSheets({ ...B, outDir, title: basename(page), shots,
  key: ['lit-t0', 'story-t6', 'stack-color-t25', 'stack-color-t50', 'knoll-color-t50', 'lit-t100', 'story-t4', 'mobile-detail-t40', ...shots.filter(x => x.name.startsWith('print-step')).map(x => x.name)] });

await cleanup();
const failed = shots.filter(s => s.errors.length + s.problems.length);
console.log(`contact sheet: ${join(outDir, 'contact.png')} · key shots: ${join(outDir, 'key.png')}`);
console.log(failed.length ? `GATE2 FAIL (${failed.length} of ${shots.length} shots)` : `GATE2 PASS (${shots.length} shots)`);
process.exit(failed.length ? 1 : 0);
} catch (e) { await bail(`GATE2 FAIL (${e.message})`); }
