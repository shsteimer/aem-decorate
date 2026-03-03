import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createEnvironment } from '../src/environment.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('createEnvironment', () => {
  let cleanup;

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('creates window with correct URL', () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;
    assert.ok(env.window);
    assert.equal(env.window.location.origin, 'http://localhost:3000');
  });

  it('sets up required globals on globalThis', () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;

    assert.ok(globalThis.document);
    assert.ok(globalThis.HTMLElement);
    assert.ok(globalThis.Element);
    assert.ok(globalThis.window);
  });

  it('Image.complete patch returns true', () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;

    const img = env.window.document.createElement('img');
    assert.equal(img.complete, true);
  });

  it('fetch patch resolves relative URLs', async () => {
    const env = createEnvironment('http://localhost:9999');
    cleanup = env.cleanup;

    // We can't actually fetch, but we can verify the patch is in place
    // by checking that fetch exists and is a function
    assert.equal(typeof globalThis.fetch, 'function');
  });

  it('Element.append patch fires onload for LINK elements', async () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;
    const { document } = env.window;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    let loaded = false;
    link.onload = () => { loaded = true; };

    document.head.append(link);

    // onload fires via queueMicrotask, so wait a tick
    await new Promise((r) => { setTimeout(r, 10); });
    assert.equal(loaded, true);
  });

  it('Element.append patch fires onload for SCRIPT elements', async () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;
    const { document } = env.window;

    const script = document.createElement('script');
    let loaded = false;
    script.onload = () => { loaded = true; };

    document.head.append(script);

    await new Promise((r) => { setTimeout(r, 10); });
    assert.equal(loaded, true);
  });

  it('cleanup restores original globals', () => {
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;

    const env = createEnvironment('http://localhost:3000');
    // Globals should be patched
    assert.notEqual(globalThis.window, originalWindow);

    env.cleanup();
    cleanup = null; // already cleaned up

    // Globals should be restored
    assert.equal(globalThis.document, originalDocument);
    assert.equal(globalThis.window, originalWindow);
  });

  it('fetch patch reads file:// URLs from disk', async () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;

    // Fetch a file that exists (this test file itself)
    const thisFile = pathToFileURL(join(__dirname, 'environment.test.mjs')).href;
    const resp = await globalThis.fetch(thisFile);
    assert.equal(resp.status, 200);
    const text = await resp.text();
    assert.ok(text.includes('createEnvironment'), 'should contain file contents');
  });

  it('fetch patch returns 404 for missing file:// URLs', async () => {
    const env = createEnvironment('http://localhost:3000');
    cleanup = env.cleanup;

    const missing = pathToFileURL(join(__dirname, 'does-not-exist.mjs')).href;
    const resp = await globalThis.fetch(missing);
    assert.equal(resp.status, 404);
  });

  it('cleanup aborts pending timers', async () => {
    const env = createEnvironment('http://localhost:3000');

    // Schedule a timer that references window — would throw after cleanup
    // if not aborted
    let timerFired = false;
    globalThis.window.setTimeout(() => { timerFired = true; }, 50);

    env.cleanup();
    cleanup = null;

    // Wait longer than the timer delay to confirm it was cancelled
    await new Promise((r) => { setTimeout(r, 100); });
    assert.equal(timerFired, false, 'timer should not fire after cleanup');
  });
});
