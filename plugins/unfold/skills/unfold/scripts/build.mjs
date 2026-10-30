#!/usr/bin/env node
// Build one self-contained Unfold page from an assembly model.
//   node scripts/build.mjs model.json out.html [--gate2 pass|skipped|fail]
// three.js and every engine module go into an import map as data: URLs, the model into a JSON script tag.
// Nothing is fetched from the network when the page opens.
import { readFileSync, writeFileSync } from 'node:fs';
import { importMap } from '../shared/inline.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..');
const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const gate2 = flag('--gate2');
if (gate2 != null && !['pass', 'skipped', 'fail'].includes(gate2)) { console.error(`build: --gate2 must be pass|skipped|fail, not ${JSON.stringify(gate2)}`); process.exit(64); }
const [src, out] = args;
if (!src || !out) { console.error('usage: node scripts/build.mjs model.json out.html [--gate2 pass|skipped|fail]'); process.exit(64); }

const model = JSON.parse(readFileSync(src, 'utf8'));
if (gate2) model.meta = { ...(model.meta || {}), gate2 };

const { imports } = importMap({ root: ROOT, prefix: 'unfold' });

const name = typeof model.product?.name === 'object' ? (model.product.name.ko || model.product.name.en) : model.product?.name;
const json = JSON.stringify(model).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${String(name || 'Unfold').replace(/[<&]/g, '')} · Unfold</title>
<meta name="generator" content="Unfold">
<script type="importmap">${JSON.stringify({ imports })}</script>
</head><body>
<div id="unfold"></div>
<noscript>Unfold needs JavaScript and WebGL.</noscript>
<script type="application/json" id="unfold-model">${json}</script>
<script type="module">import 'unfold/main.js';</script>
</body></html>
`;
if (/<script[^>]+src=["']https?:|<link[^>]+href=["']https?:/i.test(html)) { console.error('build: the page would load something from the network'); process.exit(1); }
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
