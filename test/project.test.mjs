import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { findProjectRoot, parseHeadHtml, findCodeRoot } from '../src/project.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtures = join(__dirname, 'fixtures');

describe('findProjectRoot', () => {
  it('finds project root via head.html in cwd', () => {
    const root = findProjectRoot(join(fixtures, 'standard'));
    assert.equal(root, resolve(fixtures, 'standard'));
  });

  it('finds project root walking up from subdirectory', () => {
    const root = findProjectRoot(join(fixtures, 'standard', 'scripts'));
    assert.equal(root, resolve(fixtures, 'standard'));
  });

  it('throws when no project root found', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'no-project-'));
    assert.throws(
      () => findProjectRoot(emptyDir),
      { message: /Could not find EDS project root/ },
    );
  });
});

describe('parseHeadHtml', () => {
  it('extracts scripts from standard head.html', () => {
    const { codeRootPrefix, scripts } = parseHeadHtml(join(fixtures, 'standard'));
    assert.equal(codeRootPrefix, '');
    assert.deepEqual(scripts, ['/scripts/aem.js', '/scripts/scripts.js']);
  });

  it('extracts scripts from site-root head.html', () => {
    const { codeRootPrefix, scripts } = parseHeadHtml(join(fixtures, 'site-root'));
    assert.equal(codeRootPrefix, 'mysite');
    assert.deepEqual(scripts, ['/mysite/scripts/aem.js', '/mysite/scripts/scripts.js']);
  });

  it('throws when head.html has no scripts.js reference', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'no-scripts-'));
    writeFileSync(join(tmpDir, 'head.html'), '<link rel="icon" href="data:,">');
    assert.throws(
      () => parseHeadHtml(tmpDir),
      { message: /No <script type="module"> tags found/ },
    );
  });

  it('throws when head.html has scripts but no scripts.js', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'no-scriptsjs-'));
    writeFileSync(
      join(tmpDir, 'head.html'),
      '<script src="/scripts/other.js" type="module"></script>',
    );
    assert.throws(
      () => parseHeadHtml(tmpDir),
      { message: /No scripts\/scripts\.js reference found/ },
    );
  });
});

describe('findCodeRoot', () => {
  it('finds code root at project root (standard)', () => {
    const { codeRoot, codeRootPrefix, scripts } = findCodeRoot(join(fixtures, 'standard'));
    assert.equal(codeRoot, resolve(fixtures, 'standard'));
    assert.equal(codeRootPrefix, '');
    assert.ok(scripts.length > 0);
  });

  it('finds code root in subdirectory (site-root)', () => {
    const { codeRoot, codeRootPrefix } = findCodeRoot(join(fixtures, 'site-root'));
    assert.equal(codeRoot, resolve(fixtures, 'site-root', 'mysite'));
    assert.equal(codeRootPrefix, 'mysite');
  });

  it('throws when resolved code root has no aem.js', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'bad-coderoot-'));
    writeFileSync(
      join(tmpDir, 'head.html'),
      '<script src="/scripts/aem.js" type="module"></script>\n<script src="/scripts/scripts.js" type="module"></script>',
    );
    assert.throws(
      () => findCodeRoot(tmpDir),
      { message: /scripts\/aem\.js not found/ },
    );
  });
});
