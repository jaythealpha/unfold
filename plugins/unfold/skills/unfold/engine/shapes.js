import { hingeBarrel } from './fold.js';
// Part geometry. partBoxes() is pure (Gate 1 uses it for collisions); buildPartMesh() takes THREE as an
// argument so this module still imports in Node. Meshes are built in model coordinates (mm, z = assembly
// axis) and centred on the part, so a pose can turn a part about its own centre.

const box = (x0, y0, z0, x1, y1, z1) => ({ min: [x0, y0, z0], max: [x1, y1, z1] });

// the solid pieces a part occupies, for collision checks (a frame is its walls, not its whole outline)
export function partBoxes(part) {
  const [x0, y0, z0, x1, y1, z1] = part.bbox, s = part.shape || {};
  const wall = s.wall ?? 1.6;
  if (s.template === 'housing' || s.template === 'ring') {
    const walls = [box(x0, y0, z0, x0 + wall, y1, z1), box(x1 - wall, y0, z0, x1, y1, z1),
      box(x0 + wall, y0, z0, x1 - wall, y0 + wall, z1), box(x0 + wall, y1 - wall, z0, x1 - wall, y1, z1)];
    const [f0, f1] = s.floorAt || [z0, z0 + (s.floor ?? 1.2)];
    const bumps = (s.bumps || []).map(([a0, b0, a1, b1, c0, c1]) => box(a0, b0, c0, a1, b1, c1));
    return s.template === 'housing' ? [box(x0, y0, f0, x1, y1, f1), ...walls, ...bumps] : walls;
  }
  if (s.units?.length) return s.units.map(([a0, b0, a1, b1]) => box(a0, b0, z0, a1, b1, z1));
  if (s.template === 'screw' && s.positions?.length) {
    const h = (s.head ?? 2) / 2;
    return s.positions.map(([x, y]) => box(Math.max(x0, x - h), Math.max(y0, y - h), z0, Math.min(x1, x + h), Math.min(y1, y + h), z1));
  }
  return [box(x0, y0, z0, x1, y1, z1)];
}

export const partCentre = part => { const b = part.bbox; return [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2]; };

// default material key per category; render.js maps keys to materials for each style
export const CATEGORY_MAT = { housing: 'alu', display: 'glass', board: 'pcb', battery: 'battery', camera: 'black',
  audio: 'black', haptics: 'metal', wireless: 'copper', connector: 'black', flex: 'flex', fastener: 'metal',
  bracket: 'metal', adhesive: 'adhesive', button: 'alu', port: 'metal', sim: 'metal', antenna: 'flex',
  shield: 'metal', thermal: 'copper', hinge: 'metal', other: 'black' };

// deterministic noise so a board's tiny components land in the same place on every load
const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h || 1; };

// ctx.fold (from fold.js foldInfo) tells the hinge and the folding screen where the fold line is
export function buildPartMesh(THREE, part, ctx = {}) {
  const [x0, y0, z0, x1, y1, z1] = part.bbox, s = part.shape || {};
  const [cx, cy, cz] = partCentre(part);
  const group = new THREE.Group();
  group.userData.partId = part.id;
  const baseMat = s.mat || CATEGORY_MAT[part.category] || 'black';
  const add = (geo, mat, role = 'body', color) => {
    const m = new THREE.Mesh(geo, null);
    m.userData = { partId: part.id, mat, role, color };
    group.add(m); return m;
  };
  const rr = (a0, b0, a1, b1, r) => {
    r = Math.max(0, Math.min(r ?? 0, (a1 - a0) / 2 - 0.01, (b1 - b0) / 2 - 0.01));
    const sh = new THREE.Shape();
    if (r <= 0) { sh.moveTo(a0, b0); sh.lineTo(a1, b0); sh.lineTo(a1, b1); sh.lineTo(a0, b1); sh.closePath(); return sh; }
    sh.moveTo(a0 + r, b0); sh.lineTo(a1 - r, b0); sh.quadraticCurveTo(a1, b0, a1, b0 + r);
    sh.lineTo(a1, b1 - r); sh.quadraticCurveTo(a1, b1, a1 - r, b1); sh.lineTo(a0 + r, b1);
    sh.quadraticCurveTo(a0, b1, a0, b1 - r); sh.lineTo(a0, b0 + r); sh.quadraticCurveTo(a0, b0, a0 + r, b0);
    return sh;
  };
  const holePath = (hx, hy, w, h, r) => { const p = rr(hx - w / 2, hy - h / 2, hx + w / 2, hy + h / 2, r); return p; };
  // extrude a shape between two heights, with a small bevel kept inside the outline
  const ext = (shape, za, zb, bevel = true) => {
    const depth = Math.max(0.02, zb - za), bv = bevel ? Math.min(0.35, depth * 0.22) : 0;
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - 2 * bv), bevelEnabled: bv > 0,
      bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 1, curveSegments: 8 });
    g.translate(0, 0, za + bv);
    return g;
  };
  const rbox = (a0, b0, za, a1, b1, zb, r = 0.3, bevel = true) => ext(rr(a0, b0, a1, b1, r), za, zb, bevel);
  const cylZ = (x, y, za, zb, r, seg = 28) => { const g = new THREE.CylinderGeometry(r, r, zb - za, seg); g.rotateX(Math.PI / 2); g.translate(x, y, (za + zb) / 2); return g; };

  const T = s.template;
  // the lit screen: on the front (−z) face, or on the back (+z) for a foldable's cover display. kind says which
  // screen it is ('main', 'inner' or 'cover'), so the story can light the right one
  const screenFace = (inset, r, face = 'front', kind = 'main') => {
    const a0 = x0 + inset, b0 = y0 + inset, a1 = x1 - inset, b1 = y1 - inset;
    const scr = new THREE.ShapeGeometry(rr(a0, b0, a1, b1, Math.max(1, r - inset)), 10);
    // ShapeGeometry's uv is in mm; stretch the picture over the screen once
    const pos = scr.attributes.position, uv = scr.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - a0) / (a1 - a0), (pos.getY(i) - b0) / (b1 - b0));
    scr.translate(0, 0, face === 'back' ? z1 + 0.12 : z0 - 0.12);
    const m = add(scr, 'screen', 'screen'); m.userData.screenKind = kind; m.userData.screenFace = face;
  };
  // a long slab cut into thin columns across the fold (so it can bend smoothly); u runs across the fold line
  const columns = (za, zb, inset = 0) => {
    const U = (s.axis ?? ctx.fold?.axis) === 'x' ? 1 : 0, lenU = (U ? y1 - y0 : x1 - x0) - 2 * inset, lenV = (U ? x1 - x0 : y1 - y0) - 2 * inset;
    const n = Math.min(1600, Math.ceil(lenU / 0.2));
    const g = new THREE.BoxGeometry(U ? lenV : lenU, U ? lenU : lenV, zb - za, U ? 1 : n, U ? n : 1, 1);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (za + zb) / 2); return g;
  };
  if (T === 'flexdisplay') {
    // a foldable's inner screen: thin, cut into columns so it can curl at the fold; the screen faces the table
    const bez = s.bezel ?? 1.2, U = (s.axis ?? ctx.fold?.axis) === 'x';
    add(columns(z0, z1), 'black');
    const sc = new THREE.PlaneGeometry((x1 - x0) - 2 * bez, (y1 - y0) - 2 * bez, U ? 1 : Math.min(1600, Math.ceil((x1 - x0) / 0.2)), U ? Math.min(1600, Math.ceil((y1 - y0) / 0.2)) : 1);
    sc.rotateX(Math.PI); sc.translate((x0 + x1) / 2, (y0 + y1) / 2, z0 - 0.12);
    // the picture is seen from the front: undo the plane's own flip so it lines up with the other screens
    const uv = sc.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    add(sc, 'screen', 'screen').userData.screenKind = 'inner';
    if (s.hole) { const [hx, hy, hr] = s.hole; const g = new THREE.CircleGeometry(hr, 24); g.translate(hx, hy, z0 - 0.2); add(g, 'lens', 'detail').userData.noEdges = true; }
  } else if (T === 'hinge') {
    // the hinge: a barrel along the fold line, link blocks at both ends, and a wing plate onto each half
    const U = (s.axis ?? ctx.fold?.axis) === 'x', at = s.at ?? ctx.fold?.at ?? (U ? (y0 + y1) / 2 : (x0 + x1) / 2), wing = 0.8;
    const { r, zc } = ctx.fold ? hingeBarrel(part, ctx.fold) : { r: Math.min(1.6, (z1 - z0) / 2), zc: z0 + Math.min(1.6, (z1 - z0) / 2) };
    const barrel = new THREE.CylinderGeometry(r, r, U ? x1 - x0 : y1 - y0, 20, 1);
    if (U) barrel.rotateZ(Math.PI / 2);
    barrel.translate(U ? (x0 + x1) / 2 : at, U ? at : (y0 + y1) / 2, zc);
    add(barrel, 'metal').userData.foldKind = 'mid';
    // link blocks at both ends, each cut at the fold line so each piece rides with its own side
    const blk = Math.min(6, (U ? x1 - x0 : y1 - y0) * 0.08), cut = 0.15;
    for (const e of [0, 1]) for (const [u0, u1] of [[Math.max(U ? y0 : x0, at - 2.4), at - cut], [at + cut, Math.min(U ? y1 : x1, at + 2.4)]]) {
      if (u1 - u0 < 0.2) continue;
      const g = U ? rbox(e ? x1 - blk : x0, u0, z0, e ? x1 : x0 + blk, u1, z1, 0.3) : rbox(u0, e ? y1 - blk : y0, z0, u1, e ? y1 : y0 + blk, z1, 0.3);
      add(g, 'metalDark');
    }
    const sides = U ? [[x0, y0, x1, at - 0.8], [x0, at + 0.8, x1, y1]] : [[x0, y0, at - 0.8, y1], [at + 0.8, y0, x1, y1]];
    for (const [a0, b0, a1, b1] of sides) add(rbox(a0, b0, z1 - wing, a1, b1, z1, 0.3), 'metal', 'detail');
  } else if (T === 'display') {
    const r = s.r ?? 8, back = s.face === 'back';
    add(ext(rr(x0, y0, x1, y1, r), z0, z1), 'black');
    // the panel's back plate sits on the side away from the screen
    add(back ? ext(rr(x0 + 0.6, y0 + 0.6, x1 - 0.6, y1 - 0.6, r - 0.6), z0 - 0.05, z0, false) : ext(rr(x0 + 0.6, y0 + 0.6, x1 - 0.6, y1 - 0.6, r - 0.6), z1, z1 + 0.05, false), 'metalDark', 'detail');
    // a back-facing display is a foldable's cover screen, or the main screen of a front-access phone
    screenFace(s.bezel ?? 1.2, r, back ? 'back' : 'front', s.kind || (back && ctx.access !== 'front' ? 'cover' : 'main'));
    if (s.hole) { const [hx, hy, hr] = s.hole; const g = new THREE.CircleGeometry(hr, 24); if (back) g.translate(hx, hy, z1 + 0.2); else g.translate(hx, hy, z0 - 0.2); add(g, 'lens', 'detail').userData.noEdges = true; }
    if (s.tail) { const [a0, b0, a1, b1] = s.tail; add(rbox(a0, b0, z1, a1, b1, z1 + 0.15, 0.4, false), 'flex', 'detail'); }
  } else if (T === 'housing' || T === 'ring') {
    const wall = s.wall ?? 1.6, r = s.r ?? 8, floor = s.floor ?? 1.2;
    const outer = rr(x0, y0, x1, y1, r);
    outer.holes.push(rr(x0 + wall, y0 + wall, x1 - wall, y1 - wall, Math.max(0.5, r - wall)));
    add(ext(outer, T === 'housing' ? z0 : z0, z1), s.wallMat || 'alu');
    // antenna breaks: thin plastic bands across the metal rail
    for (const [side, at] of s.bands || []) {
      const bw = 1.1, g = side === 'x0' ? rbox(x0 - 0.02, at - bw / 2, z0 + 0.6, x0 + 0.3, at + bw / 2, z1 - 0.6, 0, false)
        : side === 'x1' ? rbox(x1 - 0.3, at - bw / 2, z0 + 0.6, x1 + 0.02, at + bw / 2, z1 - 0.6, 0, false)
        : side === 'y0' ? rbox(at - bw / 2, y0 - 0.02, z0 + 0.6, at + bw / 2, y0 + 0.3, z1 - 0.6, 0, false)
        : rbox(at - bw / 2, y1 - 0.3, z0 + 0.6, at + bw / 2, y1 + 0.02, z1 - 0.6, 0, false);
      add(g, 'black', 'detail').userData.noEdges = true;
    }
    // raised areas on the body (a camera plateau): [x0, y0, x1, y1, z0, z1, r]
    for (const [a0, b0, a1, b1, c0, c1, br] of s.bumps || []) {
      const sh = rr(a0, b0, a1, b1, br ?? 3); for (const h of (s.bumpHoles || [])) sh.holes.push(holePath(...h));
      add(ext(sh, c0, c1), s.wallMat || 'alu');
    }
    if (T === 'housing' && s.floorAt) {
      const [f0, f1] = s.floorAt, sh = rr(x0 + wall - 0.05, y0 + wall - 0.05, x1 - wall + 0.05, y1 - wall + 0.05, Math.max(0.5, r - wall));
      for (const h of s.holes || []) sh.holes.push(holePath(...h));
      add(ext(sh, f0, f1), s.floorMat || 'alu');
    } else if (T === 'housing' && s.screen !== false) {
      add(ext(rr(x0 + 0.2, y0 + 0.2, x1 - 0.2, y1 - 0.2, r - 0.2), z0, z0 + floor), 'black');
      // the screen, facing the table (−z); lit at the end of the timeline
      screenFace(s.bezel ?? 1.8, r);
    }
  } else if (T === 'connector' && s.units?.length) {
    for (const [a0, b0, a1, b1] of s.units) {
      add(rbox(a0, b0, z0, a1, b1, z1, 0.3), 'black');
      add(rbox(a0 + 0.3, b0 + 0.3, z1, a1 - 0.3, b1 - 0.3, z1 + 0.08, 0.2, false), 'gold', 'detail');
    }
  } else if (T === 'plate' || T === 'adhesive' || T === 'box' || T === 'button' || T === 'motor' || T === 'shield' || T === 'battery' || T === 'speaker' || T === 'port' || T === 'connector') {
    const r = s.r ?? (T === 'battery' ? 3 : T === 'plate' ? 2 : 0.4);
    const shape = rr(x0, y0, x1, y1, r);
    for (const h of s.holes || []) shape.holes.push(holePath(...h));
    // a ring (adhesive gasket, frame band): only the outline band is solid
    if (s.ring) shape.holes.push(rr(x0 + s.ring, y0 + s.ring, x1 - s.ring, y1 - s.ring, Math.max(0.3, r - s.ring)));
    const mat = T === 'adhesive' ? (s.mat || 'adhesive') : T === 'battery' ? 'battery' : baseMat;
    // a part lying across a foldable's hinge is cut into columns so it can bend with the fold
    if (s.columns) add(columns(z0, z1), mat);
    else add(ext(shape, z0, z1, T !== 'adhesive'), mat);
    if (T === 'battery') {
      const ins = Math.min(4, (x1 - x0) / 6);
      add(ext(rr(x0 + ins, y0 + ins, x1 - ins, y1 - ins, 2), z1, z1 + 0.04, false), 'label', 'detail');
      // the protection board and its flex tail on the battery's top end
      add(rbox(x0 + (x1 - x0) * 0.3, y1 - 3.2, z0 + 0.3, x1 - (x1 - x0) * 0.3, y1 - 0.3, z1 - 0.3, 0.4), 'pcb', 'detail');
    }
    if (T === 'shield') add(ext(rr(x0 + 0.6, y0 + 0.6, x1 - 0.6, y1 - 0.6, Math.max(0, r - 0.6)), z1, z1 + 0.05, false), 'metalDark', 'detail');
    if (T === 'speaker') {
      const n = s.slots ?? 6, w = (x1 - x0) * 0.7, gx = x0 + (x1 - x0) * 0.15;
      for (let i = 0; i < n; i++) { const yy = y0 + (y1 - y0) * (i + 1) / (n + 1); add(rbox(gx, yy - 0.25, z1, gx + w, yy + 0.25, z1 + 0.06, 0.2, false), 'metal', 'detail'); }
    }
    if (T === 'connector') add(rbox(x0 + 0.3, y0 + 0.3, z1, x1 - 0.3, y1 - 0.3, z1 + 0.08, 0.2, false), 'gold', 'detail');
    if (T === 'motor') add(cylZ((x0 + x1) / 2, (y0 + y1) / 2, z1, z1 + 0.05, Math.min(x1 - x0, y1 - y0) * 0.3), 'metalDark', 'detail');
    if (T === 'port') { const my = (y0 + y1) / 2; add(rbox(x0 + 1, y0 - 0.05, (z0 + z1) / 2 - 0.6, x1 - 1, y0 + 2, (z0 + z1) / 2 + 0.6, 0.6, false), 'black', 'detail'); void my; }
  } else if (T === 'pcb') {
    const thick = s.thick ?? 0.8, r = s.r ?? 1;
    const board = (za, zb) => { const shape = rr(x0, y0, x1, y1, r); for (const h of s.holes || []) shape.holes.push(holePath(...h)); add(ext(shape, za, zb), 'pcb'); };
    board(z0, z0 + thick);
    let top = z0 + thick;
    // a stacked (sandwich) board: an interposer wall, then a second board on top
    if (s.sandwich) {
      const upper = z1 - (s.chipH ?? 1.2), mid = upper - thick, iw = 1.2;
      const ring = rr(x0 + 0.8, y0 + 0.8, x1 - 0.8, y1 - 0.8, Math.max(0.3, r - 0.8));
      ring.holes.push(rr(x0 + 0.8 + iw, y0 + 0.8 + iw, x1 - 0.8 - iw, y1 - 0.8 - iw, Math.max(0.3, r - 0.8 - iw)));
      add(ext(ring, top, mid), 'pcbDark');
      board(mid, upper); top = upper;
    }
    const rnd = rand(hash(part.id));
    const chips = s.chips || [];
    for (const [a0, b0, a1, b1, h, col] of chips) add(rbox(a0, b0, top, a1, b1, Math.min(z1, top + (h ?? 0.8)), 0.3), 'chip', 'body', col);
    // tiny passive components, scattered clear of the chips (instanced: cheap and edge-free)
    const free = (x, y) => !chips.some(([a0, b0, a1, b1]) => x > a0 - 0.6 && x < a1 + 0.6 && y > b0 - 0.6 && y < b1 + 0.6);
    const n = s.passives ?? Math.round((x1 - x0) * (y1 - y0) / 18);
    const geo = new THREE.BoxGeometry(0.9, 0.5, 0.3), inst = new THREE.InstancedMesh(geo, null, n), mtx = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) {
      const x = x0 + 1 + rnd() * (x1 - x0 - 2), y = y0 + 1 + rnd() * (y1 - y0 - 2);
      if (!free(x, y)) continue;
      mtx.makeRotationZ(rnd() < 0.5 ? 0 : Math.PI / 2); mtx.setPosition(x, y, top + 0.15); inst.setMatrixAt(k++, mtx);
    }
    inst.count = k; inst.userData = { partId: part.id, mat: 'passive', role: 'detail', noEdges: true }; group.add(inst);
  } else if (T === 'screw') {
    const hd = s.head ?? 2, hh = Math.min(0.7, (z1 - z0) * 0.35);
    for (const [x, y] of s.positions?.length ? s.positions : [[(x0 + x1) / 2, (y0 + y1) / 2]]) {
      const head = new THREE.Group();
      head.add(Object.assign(new THREE.Mesh(cylZ(0, 0, z1 - hh, z1, hd / 2, 20), null), { userData: { partId: part.id, mat: 'metal', role: 'body' } }));
      head.add(Object.assign(new THREE.Mesh(cylZ(0, 0, z0, z1 - hh, hd * 0.27, 12), null), { userData: { partId: part.id, mat: 'metalDark', role: 'body' } }));
      for (const rz of [0, Math.PI / 2]) {
        const g = new THREE.BoxGeometry(hd * 0.7, hd * 0.12, 0.08); g.rotateZ(rz); g.translate(0, 0, z1 + 0.02);
        head.add(Object.assign(new THREE.Mesh(g, null), { userData: { partId: part.id, mat: 'black', role: 'detail', noEdges: true } }));
      }
      head.position.set(x, y, 0); head.userData = { partId: part.id, screwHead: true };
      group.add(head);
    }
  } else if (T === 'flex') {
    const w = s.width ?? 3, th = 0.18;
    const pts = s.path?.length > 1 ? s.path : [[x0, (y0 + y1) / 2, (z0 + z1) / 2], [x1, (y0 + y1) / 2, (z0 + z1) / 2]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), d = b.clone().sub(a), L = d.length();
      if (L < 0.01) continue;
      const g = new THREE.BoxGeometry(L + (i < pts.length - 2 ? w * 0.02 : 0), w, th);
      const m = add(g, 'flex');
      m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
      m.position.copy(a.clone().add(b).multiplyScalar(0.5));
    }
    const e = pts[pts.length - 1];
    add(rbox(e[0] - w * 0.6, e[1] - w * 0.6, e[2], e[0] + w * 0.6, e[1] + w * 0.6, e[2] + 0.6, 0.3), 'black', 'detail');
  } else if (T === 'camera' && s.face === 'down') {
    // lenses looking out of the bottom (−z): a rear camera on a phone modelled screen up
    const barrel = s.body === false ? z1 - z0 : (s.barrel ?? 1.2), bot = z0 + barrel;
    if (s.body !== false) add(rbox(x0, y0, bot, x1, y1, z1, s.r ?? 1), 'black');
    for (const [lx, ly, r] of s.lenses || [[(x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0) * 0.35]]) {
      add(cylZ(lx, ly, z0, bot, r, 32), 'metal');
      add(cylZ(lx, ly, z0 - 0.05, z0, r * 0.72, 32), 'lens', 'detail');
      add(cylZ(lx - r * 0.25, ly + r * 0.25, z0 - 0.07, z0 - 0.05, r * 0.14, 12), 'shine', 'detail').userData.noEdges = true;
    }
  } else if (T === 'camera') {
    const barrel = s.body === false ? z1 - z0 : (s.barrel ?? 1.2), top = z1 - barrel;
    if (s.body !== false) add(rbox(x0, y0, z0, x1, y1, top, s.r ?? 1), 'black');
    for (const [lx, ly, r] of s.lenses || [[(x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0) * 0.35]]) {
      add(cylZ(lx, ly, top, z1, r, 32), 'metal');
      add(cylZ(lx, ly, z1, z1 + 0.05, r * 0.72, 32), 'lens', 'detail');
      add(cylZ(lx - r * 0.25, ly + r * 0.25, z1 + 0.05, z1 + 0.07, r * 0.14, 12), 'shine', 'detail').userData.noEdges = true;
    }
  } else if (T === 'coil') {
    add(rbox(x0, y0, z0, x1, y1, z0 + Math.max(0.1, (z1 - z0) * 0.4), s.r ?? 2, false), 'black');
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, n = Math.max(2, Math.round(s.turns ?? 9));
    const rOut = Math.max(0.6, Math.min(s.rOut ?? Infinity, Math.min(x1 - x0, y1 - y0) / 2 - 0.5)), rIn = Math.min(s.rIn ?? 6, rOut * 0.6);
    for (let i = 0; i < n; i++) {
      const r = rIn + (rOut - rIn) * i / (n - 1), g = new THREE.TorusGeometry(r, Math.min(0.32, (rOut - rIn) / n * 0.38), 6, 64);
      g.translate(mx, my, z1 - 0.2); add(g, 'copper', 'detail').userData.noEdges = true;
    }
  } else {
    add(rbox(x0, y0, z0, x1, y1, z1, s.r ?? 0.4), baseMat);
  }
  // centre the group on the part so poses rotate about the part's own centre
  for (const c of group.children) c.position.sub(new THREE.Vector3(cx, cy, cz));
  group.position.set(cx, cy, cz);
  group.userData.centre = [cx, cy, cz];
  return group;
}
