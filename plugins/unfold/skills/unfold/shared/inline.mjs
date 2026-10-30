// Build helper: every module a page needs as a data: URL in one import map, so the page fetches nothing.
//   importMap({ root, prefix }) -> { imports }
// three.js from <root>/shared/vendor, <root>/shared/*.js as 'shared/<f>', <root>/engine/*.js as '<prefix>/<f>'.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dataUrl = code => 'data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64');
const rewrite = (code, prefix) => code
  .replace(/from\s*(['"])\.\.\/shared\/([\w-]+\.js)\1/g, "from 'shared/$2'")
  .replace(/from\s*(['"])\.\/([\w-]+\.js)\1/g, `from '${prefix}/$2'`);

export function importMap({ root, prefix }) {
  const imports = {}, vendor = join(root, 'shared/vendor');
  // three.module imports its core with a relative path; give the core a bare name the import map can resolve
  imports['three/core'] = dataUrl(readFileSync(join(vendor, 'three.core.min.js'), 'utf8'));
  imports['three'] = dataUrl(readFileSync(join(vendor, 'three.module.min.js'), 'utf8').replace(/(["'])\.\/three\.core\.min\.js\1/g, '"three/core"'));
  const shared = join(root, 'shared');
  if (existsSync(shared)) for (const f of readdirSync(shared).filter(f => f.endsWith('.js')))
    imports[`shared/${f}`] = dataUrl(rewrite(readFileSync(join(shared, f), 'utf8'), 'shared'));
  for (const f of readdirSync(join(root, 'engine')).filter(f => f.endsWith('.js')))
    imports[`${prefix}/${f}`] = dataUrl(rewrite(readFileSync(join(root, 'engine', f), 'utf8'), prefix));
  return { imports };
}
