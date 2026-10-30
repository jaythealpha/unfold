// Page shell: header with evidence share, toggles, the stage (canvas + labels), the time bar, panels, exports.
import { createRenderer } from './render.js';
import { strings, pick } from './i18n.js';
import { verifiedShare, WARN_SHARE } from './model.js';
import { INTRO_END, ASM_END } from './timeline.js';

import { SPEEDS, DEFAULT_SPEED, advance, stepSpeed, speedLabel } from '../shared/speeds.js';
// seconds for the whole bar at each speed
export { SPEEDS };

const CSS = `
.uf{--ink:#15171c;--muted:#626a76;--line:#d9dee6;--panel:#ffffff;--accent:#ff5a36;--bpbg:#0f3460;
  font:14px/1.45 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:var(--ink);max-width:1180px;margin:0 auto;padding:18px 18px 28px;box-sizing:border-box}
.uf *{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,#f4f6f9,#e6eaf0);min-height:100vh}
.uf-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px 20px;flex-wrap:wrap;margin-bottom:10px}
.uf-top h1{font-size:22px;letter-spacing:-.01em;margin:0}
.uf-sub{color:var(--muted);font-size:12.5px;margin-top:2px}
.uf-trust{all:unset;cursor:pointer;display:flex;gap:6px;flex-wrap:wrap;font-size:12.5px}
.uf-trust span{padding:4px 10px;border-radius:999px;background:var(--panel);border:1px solid var(--line)}
.uf-trust .v{border-color:#9bd3b4;background:#effaf3}.uf-trust .e{border-color:#f1cf9a;background:#fff7ea}
.uf-trust:focus-visible{outline:2px solid var(--ink);outline-offset:3px;border-radius:999px}
.uf-warn{background:#fff3df;border:1px solid #f0c27a;color:#6b4500;border-radius:10px;padding:8px 12px;font-size:13px;margin:0 0 10px}
.uf-controls{display:flex;gap:10px 18px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.uf-seg{display:inline-flex;align-items:center;gap:8px}
.uf-seg>b{font-size:11.5px;color:var(--muted);font-weight:600;letter-spacing:.02em}
.uf-seg div{display:inline-flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:2px}
.uf-seg button{all:unset;cursor:pointer;padding:5px 11px;border-radius:8px;font-size:13px;white-space:nowrap}
.uf-seg button[aria-pressed=true]{background:var(--ink);color:#fff}
.uf-seg button:focus-visible{outline:2px solid var(--accent)}
.uf-stage{position:relative;height:min(68vh,640px);border-radius:16px;overflow:hidden;background:radial-gradient(120% 90% at 50% 35%,#ffffff 0%,#eef1f5 55%,#dde3ea 100%);border:1px solid var(--line);touch-action:none;user-select:none}
.uf-stage.bp{background-color:var(--bpbg);background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:80px 80px,80px 80px,16px 16px,16px 16px;border-color:#0b2747}
.uf-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}
.uf-stage canvas.drag{cursor:grabbing}
.uf-leaders{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.uf-labels{position:absolute;inset:0;pointer-events:none}
.uf-pill{position:absolute;max-width:min(240px,34%);padding:4px 10px;border-radius:999px;background:#fffdf7;border:1px solid var(--ink);font-size:12px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 0 rgba(0,0,0,.12)}
.uf-pill.on{background:#ffe1d8;border-color:var(--accent)}
.uf-pill small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:450;color:var(--muted);white-space:normal;font-size:11.5px;line-height:1.3}
.uf-pill.desc{border-radius:12px;white-space:normal;height:56px}.uf-pill.desc b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uf-ball{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#fff;border:1.5px solid var(--ink);font:700 11px/19px system-ui,sans-serif;text-align:center}
.uf-stage.bp .uf-pill{background:#0f3460;color:#e6f0ff;border-color:#e6f0ff;box-shadow:none}
.uf-stage.bp .uf-pill.on{background:#ffd23f;color:#0f3460;border-color:#ffd23f}
.uf-stage.bp .uf-pill small{color:#b9cff0}
.uf-stage.bp .uf-ball{background:#0f3460;color:#e6f0ff;border-color:#e6f0ff}
.uf-stage.bp .uf-ball.on{background:#ffd23f;color:#0f3460;border-color:#ffd23f}
.uf-view{position:absolute;right:10px;bottom:10px;display:flex;gap:6px}
.uf-view button,.uf-actions button{all:unset;cursor:pointer;font-size:12.5px;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid var(--line)}
.uf-view button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.uf-view button:focus-visible,.uf-actions button:focus-visible{outline:2px solid var(--accent)}
.uf-stepcard{position:absolute;left:12px;top:12px;width:min(320px,calc(100% - 24px));background:rgba(255,255,255,.95);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:12.5px}
.uf-stage.bp .uf-stepcard{background:rgba(9,36,72,.94);color:#e6f0ff;border-color:#3d6aa3}
.uf-stepcard h3{margin:0 0 4px;font-size:14px;overflow-wrap:anywhere}
.uf-stepcard ul{margin:4px 0;padding-left:18px}.uf-stepcard li{overflow-wrap:anywhere}
.uf-stepcard .c{color:#b3261e;font-weight:600}.uf-stage.bp .uf-stepcard .c{color:#ffd23f}
.uf-pop{position:absolute;z-index:3;width:min(300px,calc(100% - 20px));background:#fff;border:1px solid var(--ink);border-radius:12px;padding:10px 12px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.18);pointer-events:auto}
.uf-pop h4{margin:0 26px 4px 0;font-size:14px;overflow-wrap:anywhere}
.uf-pop dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:6px 0 0}.uf-pop dt{color:var(--muted)}.uf-pop dd{margin:0;overflow-wrap:anywhere}
.uf-pop .x{all:unset;cursor:pointer;position:absolute;right:8px;top:6px;font-size:16px;padding:2px 6px}
.uf-badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11.5px;font-weight:650}
.uf-badge.v{background:#e3f6ea;color:#1d6b40}.uf-badge.e{background:#fff1da;color:#8a5600}
.uf-bar{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;margin:12px 0 4px;padding:10px 14px;background:var(--panel);border:1px solid var(--line);border-radius:14px}
.uf-pl{display:flex;flex-direction:column;align-items:center;gap:4px}.uf-speed select{font:inherit;font-size:11.5px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:1px 2px;max-width:86px}
.uf-play{all:unset;cursor:pointer;width:40px;height:40px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:14px}
.uf-play:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.uf-track{position:relative;padding-bottom:16px}
.uf-track input{width:100%;margin:0;accent-color:var(--ink);cursor:pointer}
.uf-ticks{position:absolute;left:8px;right:8px;bottom:0;height:14px}
.uf-ticks i{position:absolute;bottom:0;width:1px;height:7px;background:#9aa3ae}
.uf-ticks i.cur{background:var(--accent);height:10px;width:2px}
.uf-ticks em{position:absolute;bottom:-3px;transform:translateX(-50%);font-style:normal;font-size:10px;color:var(--muted)}
.uf-now{min-width:170px;max-width:260px;text-align:right;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uf-now small{display:block;font-weight:450;color:var(--muted);font-variant-numeric:tabular-nums}
.uf-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.uf-actions button{background:var(--panel)}.uf.rec .uf-controls,.uf.rec .uf-actions,.uf.rec .uf-track{opacity:.45;pointer-events:none}
.uf-foldrow{margin:6px 0 0;padding:8px 14px;background:var(--panel);border:1px solid var(--line);border-radius:14px}
.uf-foldrow label{display:grid;grid-template-columns:auto 1fr 52px;gap:12px;align-items:center;font-size:13px}
.uf-foldrow input{width:100%;accent-color:var(--accent)}.uf-foldrow input:disabled{opacity:.4}
.uf-foldrow b{font-variant-numeric:tabular-nums;text-align:right}
.uf-bom{margin-top:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px 14px;overflow-x:auto}
.uf-bom h2,.uf-src h2{font-size:14px;margin:0 0 6px}
.uf-bom table{width:100%;border-collapse:collapse;font-size:12.5px}
.uf-bom th,.uf-bom td{text-align:left;padding:4px 6px;border-bottom:1px solid #eef0f3;vertical-align:top}
.uf-bom td.n{white-space:nowrap}.uf-bom td.nm{overflow-wrap:anywhere;min-width:120px}
.uf-bom tr.on td{background:#fff3ee}
.uf-legend{display:none;margin-top:10px;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:12.5px}
.uf-legend span{display:flex;gap:6px;align-items:baseline;overflow-wrap:anywhere}.uf-legend b{flex:none;min-width:20px;height:20px;border-radius:50%;border:1.5px solid var(--ink);display:grid;place-items:center;font-size:11px}
.uf-src{position:fixed;inset:auto 0 0 0;max-height:72vh;overflow:auto;background:#fff;border-top:1px solid var(--line);box-shadow:0 -10px 30px rgba(0,0,0,.15);padding:16px 18px 22px;z-index:10}
.uf-src[hidden]{display:none}
.uf-src .x{all:unset;cursor:pointer;float:right;font-size:13px;padding:4px 10px;border:1px solid var(--line);border-radius:999px}
.uf-src ol{padding-left:20px;margin:6px 0}.uf-src li{margin:3px 0;overflow-wrap:anywhere}
.uf-src p{color:var(--muted);font-size:12.5px;margin:6px 0}
.uf-print{display:none}
@media (max-width:600px){
  .uf{padding:12px 12px 22px}.uf-top h1{font-size:18px}
  .uf-controls{gap:8px}.uf-seg>b{display:none}.uf-seg button{padding:5px 9px;font-size:12.5px}
  .uf-stage{height:62vh;border-radius:12px}
  .uf-bar{grid-template-columns:auto 1fr;gap:10px;padding:8px 10px}.uf-now{grid-column:1/-1;text-align:left;max-width:none}
  .uf-pill{display:none}.uf-legend{display:grid}
  .uf-stepcard{top:auto;bottom:52px;font-size:12px;padding:8px 10px}.uf-stepcard ul,.uf-stepcard>div:not(.c){display:none}
}
@media print{
  body{background:#fff}.uf>*:not(.uf-print){display:none!important}.uf{max-width:none;padding:0}
  .uf-print{display:block;color:#000;font-size:11pt}
  .uf-print section{page-break-after:always;break-after:page}
  .uf-print img{width:100%;max-height:150mm;object-fit:contain;border:1px solid #ccc}
  .uf-print table{width:100%;border-collapse:collapse;font-size:9.5pt}.uf-print th,.uf-print td{border-bottom:1px solid #ddd;text-align:left;padding:3px 5px;vertical-align:top}
}`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = v => (Math.round(v * 10) / 10).toString();

export function mountUnfold(root, model, params = {}) {
  const st = { lang: params.lang === 'en' ? 'en' : 'ko', depth: ['simple', 'detail', 'manual'].includes(params.depth) ? params.depth : 'detail',
    layout: params.layout === 'knoll' ? 'knoll' : 'stack', style: params.style === 'blueprint' ? 'blueprint' : (params.style === 'color' ? 'color' : null),
    t: 0, playing: false, sel: null, speed: SPEEDS[params.speed] ? params.speed : DEFAULT_SPEED };
  if (!st.style) st.style = st.depth === 'manual' ? 'blueprint' : 'color';
  const errors = window.__unfold?.errors || [];
  let L = strings(st.lang);
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  root.className = 'uf';
  root.innerHTML = `
    <header class="uf-top"><div><h1></h1><div class="uf-sub"></div></div><button class="uf-trust" type="button"></button></header>
    <div class="uf-warn" hidden></div>
    <div class="uf-controls"></div>
    <div class="uf-stage"><canvas></canvas><svg class="uf-leaders"></svg><div class="uf-labels"></div>
      <div class="uf-stepcard" hidden></div><div class="uf-pop" hidden></div>
      <div class="uf-view"><button type="button" data-v="auto"></button><button type="button" data-v="reset"></button></div></div>
    <div class="uf-bar"><div class="uf-pl"><button class="uf-play" type="button"></button><div class="uf-speed"></div></div>
      <div class="uf-track"><input type="range" min="0" max="100" step="0.1" value="0"><div class="uf-ticks"></div></div>
      <div class="uf-now"></div></div>
    <div class="uf-foldrow" hidden><label><span></span><input type="range" min="0" max="180" step="1" value="0"><b></b></label></div>
    <div class="uf-legend"></div>
    <div class="uf-actions"></div>
    <div class="uf-bom" hidden></div>
    <aside class="uf-src" hidden></aside>
    <div class="uf-print"></div>`;
  const $ = s => root.querySelector(s);
  const stage = $('.uf-stage'), canvas = $('canvas'), range = $('.uf-track input');
  const R = createRenderer(canvas, model, { style: st.style, layout: st.layout, depth: st.depth, t: 0,
    yaw: params.yaw != null ? +params.yaw : undefined, pitch: params.pitch != null ? +params.pitch : undefined, auto: params.auto !== '0' });
  const tl = () => R.timeline;
  const partById = new Map(model.parts.map(p => [p.id, p]));
  const bomIndex = new Map(model.parts.map((p, i) => [p.id, i + 1]));
  const share = verifiedShare(model), pct = Math.round(share * 100);

  // header, toggles, actions (re-rendered on language change) -----------------------------------------
  function chrome() {
    L = strings(st.lang); document.documentElement.lang = st.lang;
    $('.uf-top h1').textContent = pick(model.product.name, st.lang);
    $('.uf-sub').textContent = [model.product.maker, model.meta.interpretation ? L.interpreted(pick(model.meta.interpretation, st.lang)) : null].filter(Boolean).join(' · ');
    $('.uf-trust').innerHTML = `<span>${L.parts(model.parts.length)}</span><span class="v">${L.verified(pct)}</span><span class="e">${L.estimated(100 - pct)}</span>${model.meta.positionsEstimated ? `<span class="e">${L.posEstimated}</span>` : ''}<span>${L.unofficialChip}</span>`;
    $('.uf-trust').setAttribute('aria-label', L.sources);
    const warn = $('.uf-warn'); warn.hidden = share >= WARN_SHARE; warn.textContent = L.warn(pct);
    const seg = (key, opts) => `<span class="uf-seg"><b>${L[key]}</b><div role="group" aria-label="${L[key]}">${opts.map(o => `<button type="button" data-k="${key}" data-o="${o}" aria-pressed="${st[key] === o}">${L[o]}</button>`).join('')}</div></span>`;
    $('.uf-controls').innerHTML = seg('depth', ['simple', 'detail', 'manual']) + seg('layout', ['stack', 'knoll']) + seg('style', ['color', 'blueprint'])
      + `<span class="uf-seg"><div role="group" aria-label="language">${['ko', 'en'].map(o => `<button type="button" data-k="lang" data-o="${o}" aria-pressed="${st.lang === o}">${o.toUpperCase()}</button>`).join('')}</div></span>`;
    $('.uf-view [data-v=auto]').textContent = L.autoCam; $('.uf-view [data-v=reset]').textContent = L.resetView;
    $('.uf-view [data-v=auto]').setAttribute('aria-pressed', R.state.auto);
    $('.uf-actions').innerHTML = `<button type="button" data-a="png">${L.png}</button><button type="button" data-a="video"${st.recording ? ' disabled' : ''}>${st.recording ? L.recording : L.video}</button><button type="button" data-a="print">${L.print}</button><button type="button" data-a="src">${L.sources}</button>`;
    foldRow.hidden = !R.foldable; foldRow.querySelector('span').textContent = L.fold;
    $('.uf-speed').innerHTML = `<select aria-label="${L.speed}">${Object.keys(SPEEDS).map(k => `<option value="${k}"${st.speed === k ? ' selected' : ''}>${speedLabel(k)}</option>`).join('')}</select>`;
    $('.uf-play').textContent = st.playing ? '❚❚' : '▶'; $('.uf-play').setAttribute('aria-label', st.playing ? L.pause : L.play);
    ticks(); bom(); sources(); setT(st.t, true);
  }

  function ticks() {
    const w = tl().windows;
    $('.uf-ticks').innerHTML = model.steps.map((s, i) => `<i style="left:${w.get(s.n)[1]}%" title="${esc(`${i + 1}. ${pick(s.title, st.lang)}`)}"></i>`).join('')
      + `<i style="left:${INTRO_END}%"></i><i style="left:${ASM_END}%"></i><em style="left:0%">0</em><em style="left:100%">100</em>`;
  }

  function bom() {
    const el = $('.uf-bom'); el.hidden = st.depth !== 'manual';
    if (el.hidden) return;
    const cur = new Set(tl().stepAt(st.t)?.parts || []);
    el.innerHTML = `<h2>${L.bom}</h2><table><thead><tr><th>${L.no}</th><th>${L.part}</th><th>${L.qty}</th><th>${L.step}</th><th>${L.fastening}</th><th>${L.confidence}</th></tr></thead><tbody>`
      + model.parts.map(p => `<tr class="${cur.has(p.id) ? 'on' : ''}"><td class="n">${bomIndex.get(p.id)}</td><td class="nm">${esc(pick(p.name, st.lang))}</td><td>${p.count}</td><td>${p.step}</td><td>${esc(fastenText(p))}</td><td>${badge(p)}</td></tr>`).join('') + '</tbody></table>';
  }

  const badge = p => `<span class="uf-badge ${p.confidence === 'verified' ? 'v' : 'e'}">${p.confidence === 'verified' ? L.verifiedBadge : L.estimatedBadge}</span>`;
  function fastenText(p) {
    const f = p.fastening; if (!f) return L.fasten.none;
    const kind = String(f.type || '').split('+').filter(Boolean).map(x => L.fasten[x] || x).join(' + ');
    return [kind || L.fasten.none, typeof f.spec === 'object' && f.spec ? pick(f.spec, st.lang) : f.spec, f.count ? `× ${f.count}` : null].filter(Boolean).join(' ');
  }

  function sources() {
    const el = $('.uf-src');
    const lim = model.meta.limitations || [];
    el.innerHTML = `<button class="x" type="button">${L.close}</button><h2>${L.sourcesTitle}</h2><p>${L.unofficial}</p><p>${L.method}</p><ol>`
      + model.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.covers ? ` — ${esc(pick(typeof s.covers === 'string' ? { ko: s.covers, en: s.covers } : s.covers, st.lang))}` : ''}</li>`).join('') + '</ol>'
      + `<p>${esc(L.gate2[model.meta.gate2] || L.gate2.unknown)}${model.meta.researchedAt ? ` · ${esc(model.meta.researchedAt)}` : ''}</p>`
      + (lim.length ? `<h2>${L.limitations}</h2><ul>${lim.map(x => `<li>${esc(pick(typeof x === 'string' ? { ko: x, en: x } : x, st.lang))}</li>`).join('')}</ul>` : '');
  }

  // time ----------------------------------------------------------------------------------------------------
  const foldRow = $('.uf-foldrow'), foldIn = $('.uf-foldrow input');
  const atEnd = () => st.t <= 0.001 || st.t >= 99.999;
  function syncFold() {
    if (!R.foldable) return;
    foldIn.disabled = !atEnd() || !!st.recording;
    const deg = R.state.foldOverride ?? R.state.story?.fold ?? 0;
    foldIn.value = deg; foldRow.querySelector('b').textContent = `${Math.round(deg)}°`;
  }
  function setT(t, force) {
    const before = st.t;
    st.t = Math.max(0, Math.min(100, t));
    if (R.foldable && st.t !== before && R.state.foldOverride != null) R.setFoldOverride(null);
    if (+range.value !== st.t) range.value = st.t;
    R.setT(st.t);
    const step = tl().stepAt(st.t), i = tl().stepIndexAt(st.t), n = model.steps.length;
    $('.uf-now').innerHTML = st.t >= 100 ? `${L.done}<small>100 / 100</small>`
      : step ? `${esc(`${L.step} ${i + 1}/${n} · ${pick(step.title, st.lang)}`)}<small>${st.t.toFixed(0)} / 100</small>`
      : `${st.t < INTRO_END ? L.intro : L.finale}<small>${st.t.toFixed(0)} / 100</small>`;
    const curIdx = Math.min(i, n - 1);
    root.querySelectorAll('.uf-ticks i').forEach((el, k) => el.classList.toggle('cur', k === curIdx));
    stepCard(step, i);
    if (st.depth === 'manual' && (force || stepChanged(i))) bom();
    syncFold();
  }
  let lastStep = -1; const stepChanged = i => { const c = i !== lastStep; lastStep = i; return c; };

  function stepCard(step, i) {
    const el = $('.uf-stepcard'); el.hidden = st.depth !== 'manual' || !step;
    if (el.hidden) return;
    const items = step.parts.map(id => partById.get(id)).filter(Boolean);
    el.innerHTML = `<h3>${L.step} ${i + 1}. ${esc(pick(step.title, st.lang))}</h3><ul>${items.map(p => `<li>${bomIndex.get(p.id)}. ${esc(pick(p.name, st.lang))} × ${p.count}</li>`).join('')}</ul>`
      + (step.tools ? `<div>${L.tools}: ${esc(pick(step.tools, st.lang))}</div>` : '') + (step.cautions ? `<div class="c">${L.cautions}: ${esc(pick(step.cautions, st.lang))}</div>` : '');
  }

  // where manual depth stops: the fully exploded start, the end of each step, the finished phone
  const stepEnds = () => [INTRO_END, ...model.steps.map(s => tl().windows.get(s.n)[1]), 100];
  let raf = 0, last = 0, goal = 100;
  function play(on) {
    st.playing = on; R.setPlaying(on); $('.uf-play').textContent = on ? '❚❚' : '▶'; $('.uf-play').setAttribute('aria-label', on ? L.pause : L.play);
    cancelAnimationFrame(raf);
    if (!on) return;
    if (R.foldable) R.setFoldOverride(null);
    if (st.t >= 100) setT(0);
    goal = st.depth === 'manual' ? stepEnds().find(e => e > st.t + 0.05) ?? 100 : 100;
    last = performance.now();
    // the rate is read every frame, so a new speed takes over smoothly from where the bar is
    const tick = now => { const dt = Math.min(0.5, (now - last) / 1000); last = now;
      const nt = Math.min(goal, advance(st.t, dt, st.speed)); setT(nt);
      if (nt >= goal) { play(false); return; } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }

  // labels ------------------------------------------------------------------------------------------------------
  const labelsEl = $('.uf-labels'), leaders = $('.uf-leaders'), legend = $('.uf-legend');
  function labelIds() {
    if (st.depth === 'simple') return model.parts.filter(p => p.key).map(p => p.id);
    const step = tl().stepAt(st.t);
    if (st.depth === 'manual') return step ? step.parts : [];
    const act = R.state.activeIds || [];
    return (act.length ? act : (step ? step.parts : [])).slice(0, 8);
  }
  function drawLabels() {
    const ids = labelIds(), rect = stage.getBoundingClientRect(), W = rect.width, H = rect.height, mobile = W <= 600;
    let html = '', svg = '';
    const bp = R.state.style === 'blueprint', stroke = bp ? '#e6f0ff' : '#15171c';
    if (st.depth === 'manual' || mobile) {
      const shown = [], placed = [];
      for (const id of ids) {
        const a = R.project(id); if (!a?.visible) continue;
        const n = st.depth === 'manual' ? bomIndex.get(id) : shown.length + 1, bx = Math.min(W - 14, a.x + 22);
        let by = Math.max(14, a.y - 22);
        // keep balloons apart: step up past any balloon already placed nearby
        for (let guard = 0; guard < 20 && placed.some(([px, py]) => Math.abs(px - bx) < 24 && Math.abs(py - by) < 24); guard++) by -= 24;
        by = Math.max(14, by); placed.push([bx, by]);
        svg += `<line x1="${a.x}" y1="${a.y}" x2="${bx}" y2="${by}" stroke="${stroke}" stroke-width="1"/><circle cx="${a.x}" cy="${a.y}" r="2.2" fill="${stroke}"/>`;
        html += `<div class="uf-ball${R.state.activeIds?.includes(id) ? ' on' : ''}" style="left:${bx}px;top:${by}px">${n}</div>`;
        shown.push([n, id]);
      }
      legend.innerHTML = mobile ? shown.map(([n, id]) => `<span><b>${n}</b>${esc(pick(partById.get(id).name, st.lang))}</span>`).join('') : '';
    } else {
      legend.innerHTML = '';
      const items = ids.map(id => ({ id, a: R.project(id) })).filter(o => o.a?.visible);
      const cx = W / 2, cols = { l: [], r: [] };
      for (const o of items) (o.a.x < cx ? cols.l : cols.r).push(o);
      const top = st.depth === 'manual' ? 140 : 14;
      for (const [side, col] of Object.entries(cols)) {
        col.sort((p, q) => p.a.y - q.a.y);
        const h = st.depth === 'simple' ? 56 : 28, gap = 6, bottom = H - 64;
        // stack the pills down from their anchors, then push the whole column up if it runs off the bottom
        let y = top - h - gap; for (const o of col) { o.y = Math.max(o.a.y - h / 2, y + h + gap); y = o.y; }
        const over = col.length ? col[col.length - 1].y + h - bottom : 0;
        if (over > 0) { for (const o of col) o.y -= over; for (let i = 0; i < col.length; i++) col[i].y = Math.max(col[i].y, i ? col[i - 1].y + h + gap : top); }
        for (const o of col) {
          const y = o.y;
          const p = partById.get(o.id), on = R.state.activeIds?.includes(o.id);
          const x = side === 'l' ? 14 : W - 14, anchorX = side === 'l' ? x + Math.min(240, W * 0.34) : x - Math.min(240, W * 0.34);
          const desc = st.depth === 'simple' && p.desc ? `<small>${esc(pick(p.desc, st.lang))}</small>` : '';
          html += `<div class="uf-pill${on ? ' on' : ''}${desc ? ' desc' : ''}" style="top:${y}px;${side === 'l' ? `left:${x}px` : `right:${14}px`}">${desc ? `<b>${esc(pick(p.name, st.lang))}</b>` : esc(pick(p.name, st.lang))}${desc}</div>`;
          const ly = y + 13, ex = side === 'l' ? Math.min(anchorX, o.a.x - 8) : Math.max(anchorX, o.a.x + 8);
          svg += `<polyline points="${side === 'l' ? x + 4 : W - 18},${ly} ${ex},${ly} ${o.a.x},${o.a.y}" fill="none" stroke="${stroke}" stroke-width="1" opacity=".8"/><circle cx="${o.a.x}" cy="${o.a.y}" r="2.2" fill="${stroke}"/>`;
        }
      }
    }
    labelsEl.innerHTML = html; leaders.innerHTML = svg;
    // pill text may be shorter than the column: pull each leader's start to the pill's real edge
    if (!(st.depth === 'manual' || mobile)) {
      const pills = labelsEl.querySelectorAll('.uf-pill'), lines = leaders.querySelectorAll('polyline'), sr = stage.getBoundingClientRect();
      pills.forEach((el, i) => { const r = el.getBoundingClientRect(), ln = lines[i]; if (!ln) return;
        const pts = ln.getAttribute('points').split(' '), left = r.left - sr.left < W / 2, edge = left ? r.right - sr.left : r.left - sr.left;
        const y = r.top - sr.top + r.height / 2; pts[0] = `${edge},${y}`; pts[1] = `${pts[1].split(',')[0]},${y}`;
        if (left ? +pts[1].split(',')[0] < edge : +pts[1].split(',')[0] > edge) pts[1] = `${edge},${y}`;
        ln.setAttribute('points', pts.join(' ')); });
    }
  }
  R.onFrame(drawLabels);

  // part popover ------------------------------------------------------------------------------------------------
  function showPop(id, x, y) {
    const pop = $('.uf-pop'), p = partById.get(id);
    if (!p) { pop.hidden = true; st.sel = null; return; }
    st.sel = id; const b = p.bbox;
    const src = p.sourceIds.map(s => model.sources.find(z => z.id === s)).filter(Boolean);
    pop.innerHTML = `<button class="x" type="button" aria-label="${L.close}">×</button><h4>${esc(pick(p.name, st.lang))}</h4>${badge(p)}
      <dl><dt>${L.size}</dt><dd>${fmt(b[3] - b[0])} × ${fmt(b[4] - b[1])} × ${fmt(b[5] - b[2])} mm</dd>
      <dt>${L.qty}</dt><dd>${p.count}</dd><dt>${L.fastening}</dt><dd>${esc(fastenText(p))}</dd>
      ${p.attachedTo ? `<dt>${L.attachedTo}</dt><dd>${esc(pick(partById.get(p.attachedTo)?.name, st.lang))}</dd>` : ''}
      <dt>${L.step}</dt><dd>${p.step}</dd>
      ${src.length ? `<dt>${L.sources}</dt><dd>${src.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join('<br>')}</dd>` : ''}</dl>
      ${p.desc ? `<p style="margin:6px 0 0">${esc(pick(p.desc, st.lang))}</p>` : ''}`;
    const r = stage.getBoundingClientRect();
    pop.style.left = Math.max(10, Math.min(r.width - 310, x + 12)) + 'px'; pop.style.top = Math.max(10, Math.min(r.height - 220, y + 12)) + 'px';
    pop.hidden = false;
    pop.querySelector('.x').onclick = () => { pop.hidden = true; st.sel = null; };
  }

  // input ---------------------------------------------------------------------------------------------------------
  const pts = new Map(); let drag = null, pinch = 0, moved = false;
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY }; else { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; } });
  canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) R.zoom(d / pinch); pinch = d; moved = true; return; }
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; canvas.classList.add('drag'); if (R.state.auto) { R.setAuto(false); $('.uf-view [data-v=auto]').setAttribute('aria-pressed', false); } }
    R.orbit(-dx * 0.4, dy * 0.3); drag = { x: e.clientX, y: e.clientY }; });
  const up = e => { pts.delete(e.pointerId); canvas.classList.remove('drag');
    if (!moved && e.type === 'pointerup' && pts.size === 0) { const id = R.pick(e.clientX, e.clientY), r = stage.getBoundingClientRect(); showPop(id, e.clientX - r.left, e.clientY - r.top); }
    if (pts.size < 2) pinch = 0; if (!pts.size) drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); R.zoom(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004)); }, { passive: false });
  canvas.addEventListener('dblclick', () => R.resetView());

  let dragFrom = 0;
  const stepTo = d => { const ends = [0, ...stepEnds()]; const i = d > 0 ? ends.findIndex(x => x > st.t + 0.05) : ends.findLastIndex(x => x < st.t - 0.05); if (i >= 0) setT(ends[i]); };
  range.addEventListener('pointerdown', () => { dragFrom = st.t; });
  range.addEventListener('input', () => { if (st.recording) { range.value = st.t; return; } if (st.playing) play(false); setT(+range.value); });
  range.addEventListener('change', () => { if (st.depth !== 'manual' || st.recording) return;
    // snap to a step end, never back onto the one it started from
    const ends = [0, ...stepEnds()], d = st.t - dragFrom, near = ends.reduce((a, b) => Math.abs(b - st.t) < Math.abs(a - st.t) ? b : a, ends[0]);
    if (Math.abs(near - dragFrom) < 0.05 && Math.abs(d) > 0.01) { dragFrom = st.t = near; stepTo(Math.sign(d)); } else setT(near);
    dragFrom = st.t; });
  range.addEventListener('keydown', e => { if (st.depth !== 'manual') return;
    const d = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 }[e.key];
    if (d) { e.preventDefault(); stepTo(d); dragFrom = st.t; } });
  $('.uf-play').onclick = () => { if (!st.recording) play(!st.playing); };
  root.addEventListener('change', e => { if (e.target.closest('.uf-speed')) st.speed = e.target.value; });
  foldIn.addEventListener('input', () => { if (!atEnd()) return; if (st.playing) play(false); R.setFoldOverride(+foldIn.value); syncFold(); });
  addEventListener('keydown', e => {
    if (/input|textarea|select/i.test(e.target.tagName) && e.target !== range) return;
    if (st.recording) return;
    if (e.key === '[' || e.key === ']') { st.speed = stepSpeed(st.speed, e.key === ']' ? 1 : -1); $('.uf-speed select').value = st.speed; return; }
    if (e.key === ' ') { e.preventDefault(); play(!st.playing); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (e.target === range) return; e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      if (st.depth === 'manual') stepTo(d);
      else setT(st.t + d); }
    if (e.key === 'Escape') { $('.uf-pop').hidden = true; $('.uf-src').hidden = true; }
  });

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (st.recording && (b.dataset.k || b.dataset.a)) return;
    if (b.dataset.k) {
      const k = b.dataset.k, o = b.dataset.o; if (st[k] === o) return;
      st[k] = o;
      if (k === 'depth') { R.setDepth(o); if (o === 'manual' && !params.style && st.style !== 'blueprint') { st.style = 'blueprint'; R.setStyle('blueprint'); }
        if (o === 'manual' && st.t < INTRO_END) setT(INTRO_END); }
      if (k === 'layout') R.setLayout(o);
      if (k === 'style') R.setStyle(o);
      chrome(); return;
    }
    const v = b.dataset.v;
    if (v === 'reset') R.resetView();
    if (v === 'auto') { R.setAuto(!R.state.auto); b.setAttribute('aria-pressed', R.state.auto); }
    const a = b.dataset.a;
    if (a === 'png') savePng();
    if (a === 'video') saveVideo(b);
    if (a === 'print') printManual();
    if (a === 'src') $('.uf-src').hidden = false;
    if (b.classList.contains('uf-trust')) $('.uf-src').hidden = false;
    if (b.matches('.uf-src .x')) $('.uf-src').hidden = true;
  });

  // exports -----------------------------------------------------------------------------------------------------
  const slug = (model.product.name.en || 'unfold').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  async function savePng() { download(await R.snapshot(2), `${slug}-t${Math.round(st.t)}.png`); }
  function saveVideo(btn) {
    if (!window.MediaRecorder || !canvas.captureStream) { alert(L.noVideo); return; }
    // MP4 first where the browser can record it: it plays and uploads almost everywhere
    const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(canvas.captureStream(30), type ? { mimeType: type } : undefined), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => { const mt = rec.mimeType || type || 'video/webm', ext = /mp4/.test(mt) ? 'mp4' : 'webm';
      download(new Blob(chunks, { type: mt }), `${slug}-assembly.${ext}`); st.recording = false; root.classList.remove('rec'); chrome(); };
    play(false); if (R.foldable) R.setFoldOverride(null); st.recording = true; root.classList.add('rec'); chrome();
    setT(0); rec.start();
    const t0 = performance.now(), dur = SPEEDS[st.speed] * 1000;
    const step = now => { const k = Math.min(1, (now - t0) / dur); setT(100 * k); if (k < 1) requestAnimationFrame(step); else setTimeout(() => rec.stop(), 600); };
    requestAnimationFrame(step);
  }
  let printFresh = false;
  function printManual() { buildPrint(); printFresh = true; setTimeout(() => window.print(), 50); }
  function buildPrint() {
    const keep = st.t, ends = model.steps.map(s => tl().windows.get(s.n)[1]);
    const shots = ends.map((t, i) => R.dataURL(t, { style: 'blueprint', depth: 'detail', focus: model.steps[i].parts })), done = R.dataURL(100, { style: 'color', depth: 'detail' });
    setT(keep, true);
    $('.uf-print').innerHTML = `<section><h1>${esc(pick(model.product.name, st.lang))} — ${L.printCover}</h1><p>${esc(model.product.maker || '')} · ${L.printedFrom}: ${pct}%</p><p>${L.unofficial}</p><img src="${done}" alt="">
      <h2>${L.bom}</h2><table><tr><th>${L.no}</th><th>${L.part}</th><th>${L.qty}</th><th>${L.step}</th><th>${L.fastening}</th><th>${L.confidence}</th></tr>
      ${model.parts.map(p => `<tr><td>${bomIndex.get(p.id)}</td><td>${esc(pick(p.name, st.lang))}</td><td>${p.count}</td><td>${p.step}</td><td>${esc(fastenText(p))}</td><td>${p.confidence === 'verified' ? L.verifiedBadge : L.estimatedBadge}</td></tr>`).join('')}</table></section>`
      + model.steps.map((s, i) => `<section><h2>${L.step} ${i + 1} / ${model.steps.length}. ${esc(pick(s.title, st.lang))}</h2><img src="${shots[i]}" alt="">
        <ul>${s.parts.map(id => partById.get(id)).map(p => `<li>${bomIndex.get(p.id)}. ${esc(pick(p.name, st.lang))} × ${p.count} — ${esc(fastenText(p))}</li>`).join('')}</ul>
        ${s.tools ? `<p>${L.tools}: ${esc(pick(s.tools, st.lang))}</p>` : ''}${s.cautions ? `<p><b>${L.cautions}:</b> ${esc(pick(s.cautions, st.lang))}</p>` : ''}</section>`).join('')
      + `<section><h2>${L.sourcesTitle}</h2><p>${L.method}</p><ol>${model.sources.map(s => `<li>${esc(s.title)} — ${esc(s.url)}</li>`).join('')}</ol></section>`;
  }
  // Cmd/Ctrl+P or the browser menu: build the manual then too (in the current language)
  addEventListener('beforeprint', () => { if (!printFresh) buildPrint(); printFresh = false; });

  // start -------------------------------------------------------------------------------------------------------
  chrome();
  let t0 = params.t != null ? +params.t : (params.step != null ? (tl().windows.get(model.steps[Math.max(0, +params.step - 1)]?.n)?.[1] ?? 0) : (st.depth === 'manual' ? INTRO_END : 0));
  setT(isFinite(t0) ? t0 : 0, true);
  if (R.foldable && params.fold != null && atEnd() && isFinite(+params.fold)) { R.setFoldOverride(+params.fold); syncFold(); }
  if (params.panel === 'sources') $('.uf-src').hidden = false;
  if (params.zoom != null && isFinite(+params.zoom) && +params.zoom > 0) R.zoom(+params.zoom);
  if (params.pick) requestAnimationFrame(() => { const a = R.project(params.pick); if (a) showPop(params.pick, a.x, a.y); });
  if (params.play === '1') play(true);
  window.__unfold = Object.assign(window.__unfold || {}, { R, model, st, errors, setT, play });
  return window.__unfold;
}
