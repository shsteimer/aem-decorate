import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { decorate } from '../src/decorate.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mockProject = join(__dirname, 'fixtures', 'mock-project');

// Simple HTML content that the mock dev server returns as .plain.html
const PLAIN_HTML = `<div>
  <h1>Hello World</h1>
  <p>Test content paragraph.</p>
</div>`;

// Start a local HTTP server to serve .plain.html content
function startMockServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url.endsWith('.plain.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(PLAIN_HTML);
      } else if (req.url.endsWith('.css')) {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end('/* mock css */');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, origin: `http://127.0.0.1:${port}` });
    });
  });
}

describe('decorate', () => {
  let server;
  let port;
  let origin;

  before(async () => {
    const result = await startMockServer();
    server = result.server;
    port = result.port;
    origin = result.origin;
  });

  after(() => {
    server.close();
  });

  it('decorates content and returns HTML', async () => {
    const result = await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'html',
      header: true,
      footer: true,
    });

    assert.ok(result.includes('<main>'), 'output should contain <main>');
    assert.ok(result.includes('Hello World'), 'output should contain page content');
    assert.ok(result.includes('section'), 'output should contain decorated sections');
  });

  it('returns markdown when format is md', async () => {
    const result = await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'md',
      header: true,
      footer: true,
    });

    // Markdown should contain the heading
    assert.ok(result.includes('Hello World'), 'md output should contain page content');
    // Should not contain raw HTML tags for structural elements
    assert.ok(result.includes('# Hello World'), 'md output should convert h1 to # heading');
  });

  it('excludes header when --no-header is set', async () => {
    const result = await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'html',
      header: false,
      footer: true,
    });

    assert.ok(!result.includes('<header>'), 'output should not contain <header>');
    assert.ok(result.includes('<main>'), 'output should still contain <main>');
  });

  it('excludes footer when --no-footer is set', async () => {
    const result = await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'html',
      header: true,
      footer: false,
    });

    assert.ok(!result.includes('<footer>'), 'output should not contain <footer>');
    assert.ok(result.includes('<main>'), 'output should still contain <main>');
  });

  it('filters output with --selector', async () => {
    const result = await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'html',
      header: true,
      footer: true,
      selector: 'main h1',
    });

    assert.ok(result.includes('Hello World'), 'filtered output should contain matched content');
    assert.ok(!result.includes('<header'), 'filtered output should not contain header');
    assert.ok(!result.includes('<footer'), 'filtered output should not contain footer');
  });

  it('throws on unreachable dev server', async () => {
    await assert.rejects(
      () => decorate({
        devOrigin: 'http://127.0.0.1:1',
        pathname: '/test-page',
        projectRoot: mockProject,
        timeout: 5000,
        format: 'html',
        header: true,
        footer: true,
      }),
      (err) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });

  it('suppresses console output during decoration and restores after', async () => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    await decorate({
      devOrigin: origin,
      pathname: '/test-page',
      projectRoot: mockProject,
      timeout: 5000,
      format: 'html',
      header: true,
      footer: true,
    });

    // After decorate returns, console methods should be restored
    assert.equal(console.log, originalLog, 'console.log should be restored');
    assert.equal(console.error, originalError, 'console.error should be restored');
    assert.equal(console.warn, originalWarn, 'console.warn should be restored');
  });

  it('restores console even when decoration fails', async () => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    try {
      await decorate({
        devOrigin: 'http://127.0.0.1:1',
        pathname: '/test-page',
        projectRoot: mockProject,
        timeout: 5000,
        format: 'html',
        header: true,
        footer: true,
      });
    } catch {
      // expected
    }

    assert.equal(console.log, originalLog, 'console.log should be restored after failure');
    assert.equal(console.error, originalError, 'console.error should be restored after failure');
    assert.equal(console.warn, originalWarn, 'console.warn should be restored after failure');
  });

  it('times out on stalled decoration', async () => {
    const stallingProject = join(__dirname, 'fixtures', 'stalling-project');

    await assert.rejects(
      () => decorate({
        devOrigin: origin,
        pathname: '/test-page',
        projectRoot: stallingProject,
        timeout: 200,
        format: 'html',
        header: true,
        footer: true,
      }),
      (err) => {
        assert.ok(err.message.includes('timed out'), `Expected timeout error, got: ${err.message}`);
        return true;
      },
    );
  });
});
