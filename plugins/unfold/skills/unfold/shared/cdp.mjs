// Headless Chrome over the DevTools protocol, with no npm packages: the core of each skill's Gate 2.
//   const B = await openBrowser({ tag: 'unfold' });          // exits 2 with GATE2 SKIPPED when it cannot run
//   const { shot, shots } = shooter({ ...B, base, outDir, check, scale });
//   await writeSheets({ ...B, outDir, title, shots, key });  // contact.png and key.png
import { spawn, execSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function findChrome() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  for (const n of ['google-chrome', 'chromium', 'chromium-browser']) { try { return execSync(`command -v ${n}`).toString().trim(); } catch {} }
  return null;
}

export async function openBrowser({ tag = 'shoot', minutes = 15 } = {}) {
  if (typeof WebSocket === 'undefined') { console.log(`GATE2 SKIPPED (needs Node 22 or newer for its built-in WebSocket; this is Node ${process.versions.node})`); process.exit(2); }
  const chrome = findChrome();
  if (!chrome) { console.log('GATE2 SKIPPED (no Chrome or Chromium found; set CHROME=/path/to/chrome)'); process.exit(2); }
  const profile = mkdtempSync(join(tmpdir(), `${tag}-shoot-`));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null, cleaned = false, deadline = null;
  const waiting = new Map(), listeners = [];
  const failAll = why => { for (const [, w] of waiting) w.rej(new Error(why)); waiting.clear(); };
  // always leave nothing behind: kill Chrome, wait for it, remove its profile
  async function cleanup() {
    if (cleaned) return; cleaned = true; clearTimeout(deadline);
    try { ws?.close(); } catch {}
    if (proc.exitCode === null && proc.signalCode === null) {
      const gone = new Promise(r => { proc.once('exit', r); setTimeout(r, 4000); }); proc.kill('SIGKILL'); await gone; }
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  const bail = async (msg, code = 1) => { console.log(msg); await cleanup(); process.exit(code); };
  proc.on('exit', () => failAll('Chrome exited'));
  process.on('SIGINT', () => bail('GATE2 FAIL (interrupted)', 130));
  process.on('SIGTERM', () => bail('GATE2 FAIL (terminated)', 143));
  deadline = setTimeout(() => bail(`GATE2 FAIL (timed out after ${minutes} minutes)`), minutes * 60 * 1000);
  const wsUrl = await new Promise((res, rej) => {
    let buf = ''; const to = setTimeout(() => rej(new Error('Chrome did not start within 30 s')), 30000);
    proc.on('exit', () => { clearTimeout(to); rej(new Error('Chrome exited before it started')); });
    proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
  }).catch(e => bail(`GATE2 FAIL (${e.message})`));
  ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', () => j(new Error('cannot connect to Chrome')), { once: true }); }).catch(e => bail(`GATE2 FAIL (${e.message})`));
  ws.addEventListener('close', () => failAll('connection to Chrome closed'));
  let id = 0;
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); } else for (const l of [...listeners]) l(m); });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id;
    const to = setTimeout(() => { if (waiting.delete(i)) rej(new Error(`${method} timed out`)); }, 45000);
    waiting.set(i, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } });
    ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // wait for the next page load, at most ms; the listener never outlives the wait
  const nextLoad = ms => new Promise(r => { let to; const f = m => { if (m.method === 'Page.loadEventFired') done(); };
    const done = () => { clearTimeout(to); const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); r(); };
    listeners.push(f); to = setTimeout(done, ms); });
  const evaluate = async expr => { const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page check threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value; };
  return { S, evaluate, nextLoad, sleep, cleanup, bail };
}

// shoot one view per call: set the viewport, load page?params, run the page check, save name.png
export function shooter({ S, evaluate, nextLoad, base, outDir, check, scale = 1 }) {
  const shots = [];
  async function shot(name, params, { w = 1280, h = 860, mobile = false } = {}) {
    await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : scale, mobile, screenWidth: w, screenHeight: h });
    await S('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    const q = new URLSearchParams(params).toString();
    const loaded = nextLoad(15000);
    await S('Page.navigate', { url: `${base}?${q}` }); await loaded;
    const res = await evaluate(check).catch(e => ({ errors: [e.message], problems: [] }));
    const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = `${name}.png`; writeFileSync(join(outDir, file), Buffer.from(data, 'base64'));
    shots.push({ name, file, params: q, ...res });
    const bad = res.errors.length + res.problems.length;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${name}${bad ? '  ' + [...res.errors, ...res.problems].join(' | ') : ''}`);
    return res;
  }
  return { shot, shots };
}

// the contact sheet of every shot (failures framed red) and the key shots two to a row, as PNGs
export async function writeSheets({ S, nextLoad, sleep, outDir, title, shots, key = [] }) {
  const esc = s => String(s).replace(/</g, '&lt;');
  const sheet = `<!doctype html><meta charset="utf-8"><title>contact sheet</title><style>body{margin:0;padding:14px;font:12px system-ui;background:#f2f4f7}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:8px;overflow:hidden}
figure.bad{border:3px solid #e0352b}img{width:100%;display:block;background:#eee}figcaption{padding:4px 8px}figcaption b{color:#e0352b}</style>
<h1 style="font-size:15px">${esc(title)}</h1><div class="g">${shots.map(s => `<figure class="${s.errors.length + s.problems.length ? 'bad' : ''}"><img src="${s.file}"><figcaption>${s.name}${s.errors.length + s.problems.length ? `<br><b>${esc([...s.errors, ...s.problems].join('\n')).replace(/\n/g, '<br>')}</b>` : ''}</figcaption></figure>`).join('')}</div>`;
  writeFileSync(join(outDir, 'contact.html'), sheet);
  const keyShots = key.map(k => shots.find(x => x.name === k)).filter(Boolean);
  writeFileSync(join(outDir, 'key.html'), `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:10px;font:13px system-ui;background:#f2f4f7}.g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
img{width:100%;display:block;border:1px solid #ddd;border-radius:6px}</style><div class="g">${keyShots.map(x => `<figure style="margin:0"><img src="${x.file}"><figcaption>${x.name}</figcaption></figure>`).join('')}</div>`);
  await S('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await S('Emulation.setTouchEmulationEnabled', { enabled: false });
  for (const name of ['contact', 'key']) {
    const loaded = nextLoad(10000);
    await S('Page.navigate', { url: pathToFileURL(resolve(join(outDir, `${name}.html`))).href }); await loaded; await sleep(400);
    const { contentSize } = await S('Page.getLayoutMetrics');
    const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1600, height: Math.ceil(contentSize.height), scale: 1 } });
    writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  }
}
