// Toon shading and ink edges shared by the skills' renderers.
export const INK = '#1b1d22', ACCENT = '#ff5a36';
export const BP = { bg: '#0f3460', fill: '#123d70', line: '#e6f0ff', dim: '#5a7fae', accent: '#ffd23f', screenOn: '#1d5a9c' };

// three light bands for MeshToonMaterial
export function gradientMap(THREE) {
  const d = new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

// edge line materials for both styles: normal, active, dimmed and ghosted
export function edgeMaterials(THREE) {
  return {
    color: new THREE.LineBasicMaterial({ color: INK }), colorActive: new THREE.LineBasicMaterial({ color: ACCENT }),
    colorDim: new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.12, depthWrite: false }),
    blueprint: new THREE.LineBasicMaterial({ color: BP.line }), blueprintActive: new THREE.LineBasicMaterial({ color: BP.accent }),
    blueprintDim: new THREE.LineBasicMaterial({ color: BP.dim, transparent: true, opacity: 0.35, depthWrite: false }),
    colorGhost: new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35, depthWrite: false }),
    blueprintGhost: new THREE.LineBasicMaterial({ color: BP.line, transparent: true, opacity: 0.45, depthWrite: false }),
  };
}
