// How sure a fact is. Every part, key or event carries sourceIds or an explicit confidence.
export const CLASSES = ['sourced', 'estimated', 'disputed', 'projection'];

// explicit confidence wins ('sourced' only with sources to show); otherwise sources make it 'sourced'; otherwise
// unknown (null)
export function classOf(item) {
  if (!item) return null;
  const hasSources = Array.isArray(item.sourceIds) && item.sourceIds.length > 0;
  if (item.confidence != null) return item.confidence === 'sourced' ? (hasSources ? 'sourced' : null) : CLASSES.includes(item.confidence) ? item.confidence : null;
  return hasSources ? 'sourced' : null;
}

// a small pill; L maps a class to its label
export const badge = (cls, L = {}) => cls ? `<span class="cf-badge cf-${cls}">${L[cls] ?? cls}</span>` : '';
