import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { decorate, toMarkdown } from '../src/decorate.mjs';

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
  let origin;

  before(async () => {
    const result = await startMockServer();
    server = result.server;
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

describe('toMarkdown', () => {
  it('adds section separators between sections', async () => {
    const html = `<main>
      <div class="section"><h1>First</h1></div>
      <div class="section"><h2>Second</h2></div>
    </main>`;

    const result = await toMarkdown(html);

    assert.ok(result.includes('# First'), 'should contain first section content');
    assert.ok(result.includes('## Second'), 'should contain second section content');
    assert.ok(result.includes('---'), 'should have section separator');

    // Separator between sections, not after last
    const separator = result.indexOf('---');
    const second = result.indexOf('## Second');
    assert.ok(separator < second, 'separator should come before second section');
    assert.ok(result.lastIndexOf('---') < second, 'no trailing separator');
  });

  it('adds block comment markers', async () => {
    const html = `<div class="hero block" data-block-name="hero">
      <h1>Hero Title</h1><p>Hero text</p>
    </div>`;

    const result = await toMarkdown(html);

    assert.ok(result.includes('<!-- block: hero -->'), 'should have block start marker');
    assert.ok(result.includes('<!-- block end: hero -->'), 'should have block end marker');

    const start = result.indexOf('<!-- block: hero -->');
    const content = result.indexOf('Hero Title');
    const end = result.indexOf('<!-- block end: hero -->');
    assert.ok(start < content, 'block start before content');
    assert.ok(content < end, 'content before block end');
  });

  it('combines section separators and block markers', async () => {
    const html = `<main>
      <div class="section">
        <div class="hero block" data-block-name="hero">
          <h1>Hero Title</h1>
        </div>
      </div>
      <div class="section">
        <h2>Second Section</h2>
        <p>More content.</p>
      </div>
    </main>`;

    const result = await toMarkdown(html);

    // Block markers present
    assert.ok(result.includes('<!-- block: hero -->'), 'should have block start');
    assert.ok(result.includes('<!-- block end: hero -->'), 'should have block end');

    // Section separator present
    assert.ok(result.includes('---'), 'should have section separator');

    // Correct ordering
    const blockStart = result.indexOf('<!-- block: hero -->');
    const blockEnd = result.indexOf('<!-- block end: hero -->');
    const separator = result.indexOf('---');
    const secondSection = result.indexOf('Second Section');

    assert.ok(blockStart < blockEnd, 'block start before block end');
    assert.ok(blockEnd < separator, 'block end before separator');
    assert.ok(separator < secondSection, 'separator before second section');

    // No trailing separator
    assert.ok(result.lastIndexOf('---') < secondSection, 'no separator after last section');
  });

  it('omits separator when there is only one section', async () => {
    const html = `<main>
      <div class="section"><h1>Only Section</h1></div>
    </main>`;

    const result = await toMarkdown(html);

    assert.ok(result.includes('# Only Section'), 'should contain section content');
    assert.ok(!result.includes('---'), 'should not have separator for single section');
  });
});
