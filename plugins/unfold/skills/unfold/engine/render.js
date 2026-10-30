// three.js renderer. The model lives in a root group turned so model z (the assembly axis) points up.
// Two styles from the same meshes: 'color' (toon bands + ink edges) and 'blueprint' (flat fills + light lines).
import * as THREE from 'three';
import { buildPartMesh, partCentre } from './shapes.js';
import { createTimeline, storyPose, screenFor, ease, INTRO_END, ASM_END } from './timeline.js';
import { foldInfo, motionOf, bAffine, mapPoint, spineBand } from './fold.js';
import { gradientMap, edgeMaterials, INK, ACCENT, BP } from '../shared/toon.js';

const COLOR = {
  alu: '#c9ced6', glass: '#2a3542', black: '#2b2d31', pcb: '#2f7d5a', pcbDark: '#22573f', chip: '#25272b', passive: '#cdbf96',
  battery: '#f0c043', label: '#fbf7ec', copper: '#c98250', flex: '#e2a63b', metal: '#b3bac2', metalDark: '#6e767e',
  gold: '#d9b45b', lens: '#0c1724', shine: '#ffffff', adhesive: '#eef2f5', screen: '#0b0d10',
};


function wallpaper(w, h, label, mirror = true) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d'), H = c.height;
  const gr = g.createLinearGradient(0, 0, c.width, H);
  gr.addColorStop(0, '#5aa9ff'); gr.addColorStop(0.5, '#9b7bff'); gr.addColorStop(1, '#ff8fab');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, H);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.fillStyle = `rgba(255,255,255,${0.06 + i * 0.02})`; g.arc(c.width * (0.2 + i * 0.17), H * (0.62 + (i % 2) * 0.12), c.width * (0.32 - i * 0.04), 0, Math.PI * 2); g.fill(); }
  // a front screen is seen from −z, so its picture is drawn mirrored across the model's x axis; a cover screen
  // (seen from +z once the phone is shut and turned over) is not
  if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `600 ${Math.round(c.width * 0.2)}px system-ui, sans-serif`;
  g.fillText('10:28', c.width / 2, H * 0.24);
  g.font = `500 ${Math.round(c.width * 0.045)}px system-ui, sans-serif`; g.globalAlpha = 0.85; g.fillText(label, c.width / 2, H * 0.29);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

function matTexture() {   // a green cutting mat with a fine grid, for the knolling layout
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#4c7a63'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 256); g.moveTo(0, i + .5); g.lineTo(256, i + .5); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i <= 256; i += 8) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, 256); g.moveTo(0, i + .5); g.lineTo(256, i + .5); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createRenderer(canvas, model, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a94a3', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(-0.6, 1.4, 0.9); scene.add(sun);

  const { w, l, t: thick } = model.product.dims;
  const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root);     // model z -> world up
  const C = [w / 2, l / 2, thick / 2];
  const pivot = new THREE.Group(); pivot.position.set(...C); root.add(pivot);          // turns the phone over in the finale
  // a foldable's two halves and its hinge: B swings rigidly; the hinge group (inner screen, hinge, cables over it)
  // bends vertex by vertex. A bar phone has everything in half A.
  const FI = foldInfo(model), halves = { a: new THREE.Group(), b: new THREE.Group(), hinge: new THREE.Group() };
  for (const g of Object.values(halves)) pivot.add(g);
  halves.b.matrixAutoUpdate = false;
  const floor = new THREE.Group(); root.add(floor);

  // materials ---------------------------------------------------------------------------------------
  const gmap = gradientMap(THREE), mats = { color: new Map(), blueprint: new Map() };
  const pull = { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const screenOff = new THREE.MeshBasicMaterial({ color: COLOR.screen, ...pull });
  const screenOn = new THREE.MeshBasicMaterial({ map: wallpaper(w, l, model.product.name.en || ''), ...pull });
  const bpScreenOn = new THREE.MeshBasicMaterial({ color: BP.screenOn, ...pull });
  const coverPart = model.parts.find(p => p.shape?.template === 'display' && p.shape?.face === 'back');
  const cb = coverPart?.bbox, coverTex = FI ? wallpaper(cb ? cb[3] - cb[0] : w / 2, cb ? cb[4] - cb[1] : l, model.product.name.en || '', false) : null;
  if (coverTex && FI.axis === 'x') { coverTex.center.set(0.5, 0.5); coverTex.rotation = Math.PI; }
  const coverOn = FI ? new THREE.MeshBasicMaterial({ map: coverTex, ...pull }) : screenOn;
  // a main screen facing +z (a front-access phone, modelled screen up) is seen from above: its picture is not mirrored
  const upOn = model.product.access === 'front' ? new THREE.MeshBasicMaterial({ map: wallpaper(w, l, model.product.name.en || '', false), ...pull }) : screenOn;
  const matFor = (style, key, color, dim) => {
    const id = `${key}|${color || ''}|${dim || 0}`, cache = mats[style];
    if (cache.has(id)) return cache.get(id);
    let m;
    if (style === 'blueprint') m = new THREE.MeshBasicMaterial({ color: BP.fill, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    else if (key === 'shine') m = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    else m = new THREE.MeshToonMaterial({ color: color || COLOR[key] || COLOR.black, gradientMap: gmap, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    if (key === 'adhesive' && style === 'color') { m.transparent = true; m.opacity = 0.55; }
    if (dim === 1) { m.transparent = true; m.opacity = style === 'blueprint' ? 0.25 : 0.14; m.depthWrite = false; }
    if (dim === 2) { m.transparent = true; m.opacity = style === 'blueprint' ? 0.4 : 0.32; m.depthWrite = false; }
    cache.set(id, m); return m;
  };
  const edgeMats = edgeMaterials(THREE);

  // parts -------------------------------------------------------------------------------------------
  const parts = new Map();   // id -> { part, group, meshes, edges, home }
  for (const part of model.parts) {
    const group = buildPartMesh(THREE, part, { fold: FI, access: model.product.access }), meshes = [], edges = [], motion = FI ? motionOf(model, part, FI) : 'a';
    const half = motion === 'bend' || motion === 'split' ? 'hinge' : motion;
    group.traverse(o => { if (o.isMesh || o.isInstancedMesh) meshes.push(o); });
    for (const m of meshes) {
      if (m.userData.noEdges || m.isInstancedMesh || m.userData.role === 'screen') continue;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), edgeMats.color);
      e.raycast = () => {}; m.add(e); edges.push(e);
    }
    const c = partCentre(part), home = new THREE.Vector3(c[0] - C[0], c[1] - C[1], c[2] - C[2]);
    group.position.copy(home); halves[half].add(group);
    const screws = group.children.filter(o => o.userData.screwHead); for (const h of screws) h.userData.home = h.position.clone();
    // for bending: each mesh's vertices as first built, and the mesh's placement inside its part
    const bend = half === 'hinge' ? meshes.filter(m => !m.isInstancedMesh).map(m => {
      const rel = new THREE.Matrix4(); for (let o = m; o && o !== group; o = o.parent) { o.updateMatrix(); rel.premultiply(o.matrix); }
      return { m, rel, inv: rel.clone().invert(), kind: m.userData.foldKind || motion, base: m.geometry.attributes.position.array.slice(), edge: m.children.find(c => c.isLineSegments) };
    }) : [];
    parts.set(part.id, { part, group, meshes, edges, home, screws, half, bend, centre: new THREE.Vector3(...c) });
  }

  // the shut spine (the hinge cover standing proud of the halves); fades in as the phone closes
  let spineMesh = null;
  if (FI && FI.spine > 0) {
    // it also fills the trough between the frames' ends and the fold line, so the shut hinge end reads solid
    const U = FI.axis === 'x', depth = 2 * FI.T + FI.gap, len = U ? w : l, band = spineBand(model, FI), sp = FI.spine + band;
    const g = new THREE.BoxGeometry(U ? len : sp, U ? sp : len, depth);
    const uc = FI.at + FI.bSign * (FI.spine - band) / 2, zc = (FI.T - (FI.T + FI.gap)) / 2;
    g.translate(U ? w / 2 - C[0] : uc - C[0], U ? uc - C[1] : l / 2 - C[1], zc - C[2]);
    const frameCol = model.parts.find(p => p.shape?.template === 'housing')?.shape?.colors?.alu;
    spineMesh = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: frameCol || COLOR.alu, gradientMap: gmap }));
    spineMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), edgeMats.color));
    spineMesh.visible = false; halves.a.add(spineMesh);
  }

  // floor: a soft contact shadow (color) and the cutting mat (knolling, color)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, l * 1.25), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(30,40,60,.32)', 'rgba(30,40,60,0)'), transparent: true, depthWrite: false }));
  shadow.position.set(w / 2, l / 2, -0.4); floor.add(shadow);
  const matTex = matTexture();
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: matTex, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  mat.position.z = -0.6; floor.add(mat);

  // dashed guides from a waiting part to its home (blueprint)
  const guideBuf = new Float32Array(model.parts.length * 6), guideGeo = new THREE.BufferGeometry(), guides = new THREE.LineSegments(guideGeo, new THREE.LineDashedMaterial({ color: '#9cc4ff', dashSize: 2.2, gapSize: 1.6 }));
  guideGeo.setAttribute('position', new THREE.BufferAttribute(guideBuf, 3));
  guides.frustumCulled = false; pivot.add(guides);

  // state ---------------------------------------------------------------------------------------------
  const S = { style: opts.style || 'color', layout: opts.layout || 'stack', depth: opts.depth || 'detail', t: 0,
    yaw: opts.yaw ?? 35, pitch: opts.pitch ?? 32, zoom: 1, auto: opts.auto ?? true, playing: false,
    target: new THREE.Vector3(), frameCentre: new THREE.Vector3(), frameR: 100, focus: null, camT: new THREE.Vector3(), camZ: 1 };
  let tl = createTimeline(model, S.layout), dirty = true;
  const frameFns = [];

  function applyStyle() {
    const bp = S.style === 'blueprint';
    canvas.parentElement?.classList.toggle('bp', bp);
    shadow.visible = !bp && S.layout === 'stack';
    mat.visible = !bp && S.layout === 'knoll';
    guides.visible = bp;
    dirty = true;
  }

  // the union of every part's box at t = 0 and t = 100; the camera fits its projection at the current angle
  const unionBox = new THREE.Box3();
  function frame() {
    const box = unionBox.makeEmpty();
    for (const { part } of parts.values()) {
      const b = part.bbox, st = tl.start(part.id), o = st.pos;
      box.expandByPoint(new THREE.Vector3(b[0], b[1], b[2])); box.expandByPoint(new THREE.Vector3(b[3], b[4], b[5]));
      if (st.fp) { box.expandByPoint(new THREE.Vector3(st.fp[0], st.fp[1], 0)); box.expandByPoint(new THREE.Vector3(st.fp[2], st.fp[3], b[5] - b[2])); }
      else { box.expandByPoint(new THREE.Vector3(b[0] + o[0], b[1] + o[1], b[2] + o[2])); box.expandByPoint(new THREE.Vector3(b[3] + o[0], b[4] + o[1], b[5] + o[2])); }
    }
    if (S.layout === 'knoll') { box.max.z += 8;
      const pad = 10; mat.scale.set(box.max.x - box.min.x + pad * 2, box.max.y - box.min.y + pad * 2, 1);
      mat.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, -0.6);
      matTex.repeat.set(mat.scale.x / 40, mat.scale.y / 40); }
    const c = box.getCenter(new THREE.Vector3());
    // model -> world: (x, y, z) -> (x, z, -y)
    S.frameCentre.set(c.x, c.z, -c.y); S.target.copy(S.frameCentre); S.camT.copy(S.frameCentre); S.camZ = 1;
    S.corners = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) S.corners.push(new THREE.Vector3(x, z, -y));
    const hb = new THREE.Box3(); for (const { part: p } of parts.values()) { hb.expandByPoint(new THREE.Vector3(p.bbox[0], p.bbox[1], p.bbox[2])); hb.expandByPoint(new THREE.Vector3(p.bbox[3], p.bbox[4], p.bbox[5])); }
    const hc = hb.getCenter(new THREE.Vector3()); S.homeCentre = new THREE.Vector3(hc.x, hc.z, -hc.y);
    S.homeCorners = []; for (const x of [hb.min.x, hb.max.x]) for (const y of [hb.min.y, hb.max.y]) for (const z of [hb.min.z, hb.max.z]) S.homeCorners.push(new THREE.Vector3(x, z, -y));
    dirty = true;
  }

  // bend the hinge group to fold angle deg (only ever while every part is home: the intro, the finale, the slider)
  let bentAt = 0;
  const v3 = new THREE.Vector3();
  function bendTo(deg) {
    if (!FI || Math.abs(deg - bentAt) < 0.05) return;
    bentAt = deg;
    for (const P of parts.values()) for (const B of P.bend) {
      const pos = B.m.geometry.attributes.position, arr = pos.array;
      for (let i = 0; i < arr.length; i += 3) {
        v3.set(B.base[i], B.base[i + 1], B.base[i + 2]).applyMatrix4(B.rel).add(P.centre);
        const q = deg > 0.05 ? mapPoint(FI, B.kind, [v3.x, v3.y, v3.z], deg) : [v3.x, v3.y, v3.z];
        v3.set(q[0], q[1], q[2]).sub(P.centre).applyMatrix4(B.inv);
        arr[i] = v3.x; arr[i + 1] = v3.y; arr[i + 2] = v3.z;
      }
      pos.needsUpdate = true; B.m.geometry.computeVertexNormals(); B.m.geometry.computeBoundingBox(); B.m.geometry.computeBoundingSphere();
      if (B.edge) { B.edge.geometry.dispose(); B.edge.geometry = new THREE.EdgesGeometry(B.m.geometry, 28); }
    }
  }
  const mB = new THREE.Matrix4(), mC = new THREE.Matrix4().makeTranslation(...C), mCi = new THREE.Matrix4().makeTranslation(-C[0], -C[1], -C[2]);

  function applyPoses() {
    let fin = storyPose(model, S.t);
    if (FI && S.foldOverride != null && (S.t <= 0.001 || S.t >= 99.999)) fin = { ...fin, flip: 1, fold: S.foldOverride, screen: screenFor(true, 1, S.foldOverride) };
    const bp = S.style === 'blueprint', active = new Set();
    S.story = fin;
    if (FI) {
      const M = bAffine(FI, fin.fold);
      mB.set(M[0][0], M[0][1], M[0][2], M[0][3], M[1][0], M[1][1], M[1][2], M[1][3], M[2][0], M[2][1], M[2][2], M[2][3], 0, 0, 0, 1);
      halves.b.matrix.copy(mCi).multiply(mB).multiply(mC); halves.b.matrixWorldNeedsUpdate = true;
      bendTo(fin.fold);
      if (spineMesh) { spineMesh.visible = fin.fold > 160; spineMesh.scale.set(1, 1, 1); }
    }
    const guidePts = [];
    for (const [id, P] of parts) {
      const pose = tl.pose(id, S.t);
      P.group.position.set(P.home.x + pose.pos[0], P.home.y + pose.pos[1], P.home.z + pose.pos[2]);
      if (P.screws.length) { P.group.rotation.set(0, 0, 0); const off = tl.headOffsets(id, S.t);
        P.screws.forEach((h, i) => { h.rotation.z = pose.rot[2]; h.position.copy(h.userData.home); if (off) { h.position.x += off[i][0]; h.position.y += off[i][1]; } }); }
      else P.group.rotation.set(pose.rot[0], pose.rot[1], pose.rot[2]);
      if (pose.active) active.add(id);
      P.active = pose.active; P.progress = pose.progress;
      if (bp && Math.hypot(...pose.pos) > 0.5) guidePts.push(P.home.x, P.home.y, P.home.z, P.group.position.x, P.group.position.y, P.group.position.z);
    }
    pivot.rotation.y = Math.PI * fin.flip;
    const dimOthers = S.depth === 'simple'; let litCount = 0;
    // in the stack, steps that are still two or more away turn to glass so they don't hide the work in progress
    const curStep = tl.stepIndexAt(S.t), stepIdx = new Map(model.steps.map((s, i) => [s.n, i]));
    for (const [, P] of parts) {
      const ghost = S.layout === 'stack' && !dimOthers && S.t >= INTRO_END && S.t <= ASM_END && stepIdx.get(P.part.step) > curStep + 1;
      const dim = dimOthers && !P.part.key ? 1 : ghost ? 2 : 0;
      for (const m of P.meshes) {
        if (m.userData.role === 'screen') { const lit = fin.screen && (m.userData.screenKind || 'main') === fin.screen;
          if (lit) litCount++;
          m.material = lit ? (bp ? bpScreenOn : m.userData.screenKind === 'cover' ? coverOn : m.userData.screenFace === 'back' ? upOn : screenOn) : (bp ? matFor('blueprint', 'screen') : screenOff); continue; }
        m.material = matFor(S.style, m.userData.mat, S.style === 'color' ? (m.userData.color || P.part.shape?.colors?.[m.userData.mat] || (m.userData.role === 'body' && P.part.shape?.color) || null) : null, dim);
      }
      const em = dim === 1 ? edgeMats[S.style + 'Dim'] : P.active ? edgeMats[S.style + 'Active'] : dim === 2 ? edgeMats[S.style + 'Ghost'] : edgeMats[S.style];
      for (const e of P.edges) e.material = em;
    }
    guideBuf.fill(0); guideBuf.set(guidePts.slice(0, guideBuf.length)); guideGeo.attributes.position.needsUpdate = true;
    guideGeo.setDrawRange(0, guidePts.length / 3); guides.computeLineDistances();
    S.activeIds = [...active]; S.litScreens = litCount;
    dirty = true;
  }

  function placeCamera() {
    const rect = canvas.getBoundingClientRect(), aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
    const yaw = S.yaw * Math.PI / 180, pitch = S.pitch * Math.PI / 180;
    const dir = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));
    // near the end the view settles on the assembled phone (a function of t, so a screenshot at t=100 shows it)
    const c01 = v => Math.max(0, Math.min(1, v)), f = S.t < INTRO_END ? 1 - ease(c01((S.t - 3) / 5)) : ease(c01((S.t - (ASM_END - 6)) / 8));
    let homeC = S.homeCentre, homeK = S.homeCorners;
    if (f > 0) {   // the finished phone as it actually stands now (turned over, maybe folded)
      root.updateMatrixWorld(true); const hb = new THREE.Box3();
      for (const P of parts.values()) hb.expandByObject(P.group);
      if (!hb.isEmpty()) { homeC = hb.getCenter(new THREE.Vector3()); homeK = [];
        for (const x of [hb.min.x, hb.max.x]) for (const y of [hb.min.y, hb.max.y]) for (const z of [hb.min.z, hb.max.z]) homeK.push(new THREE.Vector3(x, y, z)); }
    }
    const look = S.camT.clone().lerp(homeC || S.camT, f);
    camera.position.copy(look).addScaledVector(dir, 2000); camera.lookAt(look);
    camera.updateMatrixWorld();
    // fit the box as seen from this angle (the phone flips about its own centre, so the box still holds)
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const fit = (corners, c0) => { let hr = 1, hu = 1; for (const c of corners || []) { const d = c.clone().sub(c0); hr = Math.max(hr, Math.abs(d.dot(right))); hu = Math.max(hu, Math.abs(d.dot(up))); } return Math.max(hu, hr / aspect) * 1.1; };
    let half = fit(S.corners, S.frameCentre);
    if (f > 0) half = half + (fit(homeK, homeC) * 1.25 - half) * f;
    half /= S.zoom * S.camZ;
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false); dirty = true;
  }

  // the auto camera eases toward the parts being fitted while the bar plays
  function followCamera() {
    let goal = S.frameCentre, gz = 1;
    if (S.auto && S.playing && S.activeIds?.length) {
      const v = new THREE.Vector3(), tmp = new THREE.Vector3();
      for (const id of S.activeIds) { parts.get(id).group.getWorldPosition(tmp); v.add(tmp); }
      v.multiplyScalar(1 / S.activeIds.length); goal = S.frameCentre.clone().lerp(v, 0.55); gz = 1.35;
    }
    const before = S.camT.clone(), z0 = S.camZ;
    S.camT.lerp(goal, 0.06); S.camZ += (gz - S.camZ) * 0.06;
    return before.distanceToSquared(S.camT) > 1e-4 || Math.abs(z0 - S.camZ) > 1e-4;
  }

  function loop() {
    const moving = followCamera();
    if (dirty || moving) { placeCamera(); renderer.render(scene, camera); dirty = false; for (const f of frameFns) f(); }
    requestAnimationFrame(loop);
  }

  const R = {
    three: THREE, state: S, model,
    get timeline() { return tl; },
    setStyle(s) { S.style = s; applyStyle(); applyPoses(); },
    setLayout(lay) { S.layout = lay; tl = createTimeline(model, lay); frame(); applyStyle(); applyPoses(); },
    setDepth(d) { S.depth = d; applyPoses(); },
    setT(t) { S.t = Math.max(0, Math.min(100, t)); applyPoses(); },
    setPlaying(p) { S.playing = p; dirty = true; },
    foldable: !!FI,
    setFoldOverride(deg) { S.foldOverride = deg == null ? null : Math.max(0, Math.min(180, deg)); applyPoses(); },
    setAuto(a) { S.auto = a; dirty = true; },
    orbit(dyaw, dpitch) { S.yaw += dyaw; S.pitch = Math.max(-80, Math.min(85, S.pitch + dpitch)); dirty = true; },
    setView(yaw, pitch) { S.yaw = yaw; S.pitch = pitch; dirty = true; },
    zoom(k) { S.zoom = Math.max(0.5, Math.min(8, S.zoom * k)); dirty = true; },
    resetView() { S.yaw = opts.yaw ?? 35; S.pitch = opts.pitch ?? 32; S.zoom = 1; dirty = true; },
    resize, onFrame(fn) { frameFns.push(fn); },
    renderNow() { followCamera(); placeCamera(); renderer.render(scene, camera); dirty = false; for (const f of frameFns) f(); },
    project(id) {
      const P = parts.get(id); if (!P) return null;
      const v = P.group.getWorldPosition(new THREE.Vector3()).project(camera), rect = canvas.getBoundingClientRect();
      return { x: (v.x + 1) / 2 * rect.width, y: (1 - v.y) / 2 * rect.height, visible: Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 };
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hits = ray.intersectObjects([...parts.values()].map(p => p.group), true).filter(h => h.object.userData.partId && !(h.object.material?.transparent && h.object.material.opacity < 0.3));
      return hits.length ? hits[0].object.userData.partId : null;
    },
    snapshot(scale = 2) {
      const pr = renderer.getPixelRatio(); renderer.setPixelRatio(scale); resize(); placeCamera(); renderer.render(scene, camera);
      return new Promise(res => canvas.toBlob(b => { renderer.setPixelRatio(pr); resize(); dirty = true; res(b); }, 'image/png'));
    },
    // render one frame at another t / style (for the printed manual) and return it as an image. With focus (part ids),
    // the view closes in on those parts, keeping about as much again around them so the reader sees where they sit.
    dataURL(t, { style, depth, focus } = {}) {
      const keep = { t: S.t, style: S.style, depth: S.depth, camT: S.camT.clone(), camZ: S.camZ, fold: S.foldOverride };
      S.foldOverride = null;
      S.style = style || S.style; S.depth = depth || S.depth; S.t = t; applyStyle(); applyPoses();
      S.camT.copy(S.frameCentre); S.camZ = 1; placeCamera();
      if (focus?.length) {
        root.updateMatrixWorld(true); const b = new THREE.Box3();
        for (const id of focus) { const P = parts.get(id); if (P) b.expandByObject(P.group); }
        if (!b.isEmpty()) {
          const c = b.getCenter(new THREE.Vector3()), right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
          const aspect = (camera.right - camera.left) / (camera.top - camera.bottom); let hr = 1, hu = 1;
          for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
            const d = new THREE.Vector3(x, y, z).sub(c); hr = Math.max(hr, Math.abs(d.dot(right))); hu = Math.max(hu, Math.abs(d.dot(up))); }
          const z = Math.max(1, Math.min(3, camera.top / (Math.max(hu, hr / aspect) * 2.2)));
          if (z > 1.05) { S.camT.copy(c); S.camZ = z; placeCamera(); }
        }
      }
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      Object.assign(S, { t: keep.t, style: keep.style, depth: keep.depth, camZ: keep.camZ, foldOverride: keep.fold }); S.camT.copy(keep.camT); applyStyle(); applyPoses();
      return url;
    },
    canvas,
  };
  resize(); frame(); applyStyle(); R.setT(opts.t ?? 0);
  new ResizeObserver(resize).observe(canvas);
  requestAnimationFrame(loop);
  return R;
}
