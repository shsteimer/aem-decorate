import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';

/**
 * Walk up from startDir looking for head.html (EDS project marker).
 * Returns the directory containing head.html, or throws.
 */
export function findProjectRoot(startDir) {
  let dir = resolve(startDir);
  const root = dirname(dir);

  while (true) {
    if (existsSync(join(dir, 'head.html'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not find EDS project root (no head.html found above ${startDir})`,
  );
}

/**
 * Parse head.html to extract module script entries.
 * Returns { codeRootPrefix, scripts } where:
 *   - codeRootPrefix: path prefix before /scripts/scripts.js (e.g. 'mysite' or '')
 *   - scripts: ordered list of script src paths from head.html
 */
export function parseHeadHtml(projectRoot) {
  const headPath = join(projectRoot, 'head.html');
  const html = readFileSync(headPath, 'utf-8');

  // Match all <script src="..." type="module"> tags
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*type="module"[^>]*>|<script\s+[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/g;
  const scripts = [];
  let match;
  while ((match = scriptPattern.exec(html)) !== null) {
    scripts.push(match[1] || match[2]);
  }

  if (scripts.length === 0) {
    throw new Error(`No <script type="module"> tags found in ${headPath}`);
  }

  // Derive codeRootPrefix from the scripts.js entry
  const scriptsJsEntry = scripts.find((s) => s.endsWith('/scripts/scripts.js'));
  if (!scriptsJsEntry) {
    throw new Error(`No scripts/scripts.js reference found in ${headPath}`);
  }

  // e.g. '/webassets/scripts/scripts.js' → 'webassets'
  // e.g. '/scripts/scripts.js' → ''
  const prefix = scriptsJsEntry.split('/scripts/scripts.js')[0].replace(/^\//, '');

  return { codeRootPrefix: prefix, scripts };
}

/**
 * Find the code root directory within a project.
 * For standard projects, this is projectRoot itself.
 * For site-root projects (e.g. /mysite/scripts/scripts.js), this is projectRoot/mysite.
 */
export function findCodeRoot(projectRoot) {
  const { codeRootPrefix, scripts } = parseHeadHtml(projectRoot);
  const codeRoot = codeRootPrefix
    ? join(projectRoot, codeRootPrefix)
    : projectRoot;

  const aemPath = join(codeRoot, 'scripts', 'aem.js');
  if (!existsSync(aemPath)) {
    throw new Error(`scripts/aem.js not found at ${aemPath}`);
  }

  return { codeRoot, codeRootPrefix, scripts };
}
