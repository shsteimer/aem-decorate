import { join } from 'path';
import { pathToFileURL } from 'url';
import { findProjectRoot, findCodeRoot } from './project.mjs';
import { createEnvironment } from './environment.mjs';

/**
 * Fetch .plain.html content from the dev server.
 */
async function fetchContent(devOrigin, pathname) {
  let urlPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (urlPath.endsWith('/')) urlPath += 'index';
  const plainPath = urlPath.endsWith('.plain.html') ? urlPath : `${urlPath}.plain.html`;
  const url = `${devOrigin}${plainPath}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch content from ${url}: HTTP ${resp.status}`);
  }
  return resp.text();
}

/**
 * Wait for sections and blocks to finish decorating.
 *
 * Resolves when either:
 *   - All managed sections (those with a sectionStatus) reach "loaded", OR
 *   - Decoration stabilizes — no section/block status changes for `stableMs`
 *
 * Sections without a sectionStatus (e.g. injected by dynamic blocks like tabs)
 * are ignored since they don't participate in the standard lifecycle.
 */
function waitForDecoration(document, timeout, stableMs = 2000) {
  const main = document.querySelector('main');
  const start = Date.now();
  let lastSnapshot = '';
  let stableSince = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const sections = main.querySelectorAll('.section');
      const managed = [...sections].filter((s) => s.dataset.sectionStatus !== undefined);
      const allLoaded = managed.length === 0
        || managed.every((s) => s.dataset.sectionStatus === 'loaded');

      const headerFooterBlocks = [...document.querySelectorAll('header .block, footer .block')];
      const blocksReady = headerFooterBlocks
        .every((b) => b.dataset.blockStatus === 'loaded');

      if (allLoaded && blocksReady) {
        resolve();
        return;
      }

      // Track stabilization — resolve if nothing has changed for stableMs
      const snapshot = `${managed.map((s) => s.dataset.sectionStatus).join(',')}|${headerFooterBlocks.map((b) => b.dataset.blockStatus).join(',')}`;

      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        stableSince = Date.now();
      } else if (Date.now() - stableSince > stableMs) {
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        const stalled = managed
          .filter((s) => s.dataset.sectionStatus !== 'loaded')
          .map((s) => `  ${s.className} [${s.dataset.sectionStatus}]`);
        reject(new Error(`Decoration timed out after ${timeout}ms. Stalled sections:\n${stalled.join('\n')}`));
      } else {
        setTimeout(check, 50);
      }
    };
    setTimeout(check, 50);
  });
}

/**
 * Strip residual display:none from loaded sections.
 * Happy-DOM doesn't fully handle `style.display = null` which loadSection uses.
 */
function cleanupStyles(document) {
  document.querySelectorAll('.section[data-section-status="loaded"]').forEach((s) => {
    s.style.removeProperty('display');
  });
}

/**
 * Convert HTML to markdown using turndown.
 * Adds structural markers for AEM sections and blocks.
 */
export async function toMarkdown(html) {
  const TurndownService = (await import('turndown')).default;
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  const hasClass = (node, name) => (node.getAttribute('class') || '').split(/\s+/).includes(name);

  turndown.addRule('section', {
    filter: (node) => node.nodeName === 'DIV' && hasClass(node, 'section'),
    replacement: (content, node) => (node.nextElementSibling
      ? `${content.trim()}\n\n---\n\n`
      : content.trim()),
  });

  turndown.addRule('block', {
    filter: (node) => node.nodeName === 'DIV' && hasClass(node, 'block'),
    replacement: (content, node) => {
      const name = node.getAttribute('data-block-name') || 'unknown';
      return `<!-- block: ${name} -->\n\n${content.trim()}\n\n<!-- block end: ${name} -->`;
    },
  });

  return turndown.turndown(html);
}

// Cache-bust counter for script imports. Node.js ESM caches by URL, so
// without this, module-level side effects (e.g. loadPage() in scripts.js)
// only run on the first decorate() call in a process.
let importSeq = 0;

/**
 * Main decoration function.
 *
 * @param {object} config - Configuration from parseArgs
 * @param {string} config.devOrigin - Dev server origin
 * @param {string} config.pathname - Page pathname
 * @param {string} [config.projectRoot] - AEM project root (auto-detected if omitted)
 * @param {string} [config.selector] - CSS selector to filter output
 * @param {number} [config.timeout=15000] - Decoration timeout in ms
 * @param {string} [config.format='html'] - Output format: 'html' or 'md'
 * @param {boolean} [config.header=true] - Include header in output
 * @param {boolean} [config.footer=true] - Include footer in output
 * @returns {Promise<string>} Decorated output
 */
export async function decorate(config) {
  const {
    devOrigin,
    pathname,
    selector,
    timeout = 15000,
    format = 'html',
    header: includeHeader = true,
    footer: includeFooter = true,
  } = config;

  importSeq += 1;

  // Resolve project and code root
  const projectRoot = config.projectRoot || findProjectRoot(process.cwd());
  const { codeRoot, scripts } = findCodeRoot(projectRoot);

  // Set up headless environment
  const { window, cleanup } = createEnvironment(devOrigin);

  // Suppress console output during decoration — block code logs block load
  // failures via console.log/error, and Happy-DOM objects serialize as
  // massive symbol dumps that pollute output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const noop = () => {};
  console.log = noop;
  console.error = noop;
  console.warn = noop;

  // Capture stray promise rejections from the AEM pipeline (e.g. block
  // loading failures that reject with DOM Event objects). These escape the
  // main await chain and would otherwise crash the process.
  const strayRejections = [];
  const rejectionHandler = (reason) => strayRejections.push(reason);
  process.on('unhandledRejection', rejectionHandler);

  try {
    // Fetch page content from dev server
    const html = await fetchContent(devOrigin, pathname);

    const { document } = window;

    // Build DOM: head with scripts.js reference, body with header/main/footer
    const scriptsJsPath = join(codeRoot, 'scripts', 'scripts.js');
    const scriptsUrl = pathToFileURL(scriptsJsPath).href;
    document.head.innerHTML = `<meta charset="utf-8"><title>Decorate</title><script src="${scriptsUrl}"></script>`;
    document.body.innerHTML = `<header></header><main>${html}</main><footer></footer>`;

    // Import all module scripts from head.html in order
    for (const scriptSrc of scripts) {
      // Map the script src path to a local file path
      // e.g. '/scripts/aem.js' → codeRoot/../scripts/aem.js (relative to project root)
      // or '/mysite/scripts/aem.js' → projectRoot/mysite/scripts/aem.js
      const relativePath = scriptSrc.replace(/^\//, '');
      const localPath = join(projectRoot, relativePath);
      const fileUrl = pathToFileURL(localPath).href;

      await import(`${fileUrl}?seq=${importSeq}`);

      // After importing aem.js, override codeBasePath so loadBlock uses file:// URLs
      if (scriptSrc.endsWith('/aem.js') && window.hlx) {
        window.hlx.codeBasePath = pathToFileURL(codeRoot).href;
      }
    }

    // Wait for decoration to complete
    await waitForDecoration(document, timeout);

    // Clean up residual styles
    cleanupStyles(document);

    // Collect output
    if (selector) {
      const elements = document.querySelectorAll(selector);
      const htmlParts = [...elements].map((el) => el.outerHTML);
      const combined = htmlParts.join('\n');
      return format === 'md' ? await toMarkdown(combined) : combined;
    }

    const parts = [];
    const headerEl = document.querySelector('header');
    const mainEl = document.querySelector('main');
    const footerEl = document.querySelector('footer');

    if (includeHeader && headerEl) parts.push(headerEl.outerHTML);
    if (mainEl) parts.push(mainEl.outerHTML);
    if (includeFooter && footerEl) parts.push(footerEl.outerHTML);

    const output = parts.join('\n');
    return format === 'md' ? await toMarkdown(output) : output;
  } finally {
    process.removeListener('unhandledRejection', rejectionHandler);
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    cleanup();
  }
}
