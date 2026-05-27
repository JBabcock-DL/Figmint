import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nestedHtml = resolve(rootDir, 'dist/src/ui/index.html');
const uiHtml = resolve(rootDir, 'dist/ui.html');

if (!existsSync(nestedHtml)) {
  process.exit(0);
}

let html = readFileSync(nestedHtml, 'utf8');

/**
 * Strip `type="module"` and `crossorigin` from the inlined `<script>` tag.
 *
 * Figma posts `__html__` to the plugin iframe's `data:text/html` bootstrap, which
 * calls `document.write(payload)`. Module scripts inside a write()-injected document
 * are unreliable across Chromium versions, so we downgrade to a classic script. The
 * Vite module-loader preamble is already removed by viteSingleFile's
 * `removeViteModuleLoader: true`, leaving a body that is plain ES2017-compatible code.
 *
 * Function callbacks bypass `String.prototype.replace`'s special pattern interpretation
 * (`$&`, `` $` ``, `$'`, `$n`, `$$`) — important here because the bundle body contains
 * those tokens (e.g. React 19's `escape()` returns `` `$` `` + key).
 */
html = html.replace(/<script\b([^>]*)>/g, (match, attrs) => {
  if (/\bsrc=/.test(attrs)) {
    return match;
  }
  const stripped = attrs
    .replace(/\s+type="module"/g, '')
    .replace(/\s+crossorigin(?:="[^"]*")?/g, '');
  return `<script${stripped}>`;
});

/**
 * Move the inlined `<script>` to the end of `<body>` after `#root`. Vite hoists
 * inlined module scripts into `<head>`; once stripped of `type="module"` they execute
 * synchronously during parsing and would not see `#root` yet, throwing
 * "Root element #root not found".
 *
 * Implemented with `slice`/concat — NOT `String.prototype.replace` — because the
 * bundle content is uncontrolled and contains literal `` `$` ``, `$$`, and `$&`
 * tokens that would otherwise be expanded as backreferences and recursively splice
 * the surrounding HTML into the bundle.
 */
const scriptOpenRe = /<script\b(?![^>]*\bsrc=)[^>]*>/;
const openMatch = scriptOpenRe.exec(html);
const bodyOpenIdx = html.indexOf('<body');
if (openMatch && openMatch.index < bodyOpenIdx) {
  const openIdx = openMatch.index;
  const closeMarker = '</script>';
  const closeIdx = html.indexOf(closeMarker, openIdx + openMatch[0].length);
  if (closeIdx > openIdx) {
    const scriptTag = html.slice(openIdx, closeIdx + closeMarker.length);
    const before = html.slice(0, openIdx);
    const after = html.slice(closeIdx + closeMarker.length);
    const removed = before + after;
    const bodyCloseIdx = removed.indexOf('</body>');
    if (bodyCloseIdx >= 0) {
      html = `${removed.slice(0, bodyCloseIdx)}  ${scriptTag}\n  ${removed.slice(bodyCloseIdx)}`;
    }
  }
}

writeFileSync(uiHtml, html, 'utf8');
rmSync(resolve(rootDir, 'dist/src'), { recursive: true, force: true });
