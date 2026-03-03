import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { Window } from 'happy-dom';

const GLOBALS = [
  'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'NodeList',
  'DOMParser', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
  'CustomEvent', 'Event', 'URLSearchParams',
  'sessionStorage', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'matchMedia', 'NodeFilter', 'XMLHttpRequest',
  'Image', 'performance',
];

function setGlobal(key, value) {
  try {
    globalThis[key] = value;
  } catch {
    try {
      Object.defineProperty(globalThis, key, { value, configurable: true });
    } catch { /* skip if truly immutable */ }
  }
}

/**
 * Create a Happy-DOM environment with all globals patched for EDS scripts.
 * Returns { window, cleanup } where cleanup restores original globals.
 */
export function createEnvironment(devOrigin) {
  const window = new Window({ url: devOrigin });

  // Save originals for cleanup
  const saved = new Map();
  for (const key of GLOBALS) {
    saved.set(key, { value: globalThis[key], exists: key in globalThis });
  }
  saved.set('window', { value: globalThis.window, exists: 'window' in globalThis });
  saved.set('crypto', { value: globalThis.crypto, exists: 'crypto' in globalThis });

  // Save original fetch and Element.prototype.append
  const originalFetch = globalThis.fetch;
  const originalAppend = globalThis.Element?.prototype?.append;

  // Bridge browser globals to Node.js globalThis
  setGlobal('window', window);
  for (const key of GLOBALS) {
    try {
      if (window[key] !== undefined) setGlobal(key, window[key]);
    } catch { /* skip */ }
  }
  if (!globalThis.crypto) {
    try { setGlobal('crypto', window.crypto); } catch { /* ok */ }
  }

  // Patch: images always report complete (prevents waitForFirstImage hang)
  Object.defineProperty(
    window.HTMLImageElement.prototype,
    'complete',
    { get: () => true, configurable: true },
  );

  // Patch fetch: resolve relative URLs against dev server, serve file:// from disk
  const nodeFetch = originalFetch;
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string') {
      if (input.startsWith('/')) {
        return nodeFetch(`${devOrigin}${input}`, init);
      }
      if (input.startsWith('file://')) {
        // Node's fetch doesn't support file:// URLs — read from disk
        try {
          const filePath = fileURLToPath(input);
          if (!existsSync(filePath)) {
            return Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' }));
          }
          const body = readFileSync(filePath);
          return Promise.resolve(new Response(body, { status: 200 }));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    }
    return nodeFetch(input, init);
  };

  // Patch: auto-fire onload for link/script elements
  const origAppend = globalThis.Element.prototype.append;
  globalThis.Element.prototype.append = function append(...nodes) {
    origAppend.call(this, ...nodes);
    for (const node of nodes) {
      if (node && node.tagName === 'LINK' && node.rel === 'stylesheet') {
        queueMicrotask(() => { if (node.onload) node.onload(); });
      }
      if (node && node.tagName === 'SCRIPT') {
        queueMicrotask(() => { if (node.onload) node.onload(); });
      }
    }
  };

  function cleanup() {
    // Abort all pending async tasks (timers, etc.) before restoring globals,
    // otherwise callbacks fire after globals are removed → ReferenceError
    window.happyDOM?.abort();

    // Restore all saved globals
    for (const [key, { value, exists }] of saved) {
      if (exists) {
        setGlobal(key, value);
      } else {
        try { delete globalThis[key]; } catch { /* ok */ }
      }
    }

    // Restore original fetch
    globalThis.fetch = originalFetch;

    // Restore original Element.prototype.append
    if (originalAppend) {
      globalThis.Element.prototype.append = originalAppend;
    }

    window.close();
  }

  return { window, cleanup };
}
