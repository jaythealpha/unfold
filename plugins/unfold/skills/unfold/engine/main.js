// Boot: read the embedded model and the URL parameters, then mount the page.
import { normalizeModel } from './model.js';
import { mountUnfold } from './ui.js';

const errors = [];
window.__unfold = { errors };
addEventListener('error', e => errors.push(String(e.message || e)));
addEventListener('unhandledrejection', e => errors.push(String(e.reason?.message || e.reason)));

try {
  const raw = JSON.parse(document.getElementById('unfold-model').textContent);
  const params = Object.fromEntries(new URLSearchParams(location.search));
  mountUnfold(document.getElementById('unfold'), normalizeModel(raw), params);
  window.__unfold.ready = true;
} catch (e) {
  errors.push(String(e?.stack || e));
  document.getElementById('unfold').textContent = 'Unfold could not start: ' + (e?.message || e);
}
