import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, formatHelp, formatVersion } from '../src/cli.mjs';

describe('parseArgs', () => {
  let savedPort;

  beforeEach(() => {
    savedPort = process.env.AEM_PORT;
    delete process.env.AEM_PORT;
  });

  afterEach(() => {
    if (savedPort !== undefined) {
      process.env.AEM_PORT = savedPort;
    } else {
      delete process.env.AEM_PORT;
    }
  });

  it('parses a full URL correctly', () => {
    const config = parseArgs(['http://localhost:3000/my-page']);
    assert.equal(config.url, 'http://localhost:3000/my-page');
    assert.equal(config.devOrigin, 'http://localhost:3000');
    assert.equal(config.pathname, '/my-page');
  });

  it('parses a path-only input with default port', () => {
    const config = parseArgs(['/my-page']);
    assert.equal(config.devOrigin, 'http://localhost:3000');
    assert.equal(config.pathname, '/my-page');
  });

  it('parses a path-only input without leading slash', () => {
    const config = parseArgs(['my-page']);
    assert.equal(config.pathname, '/my-page');
  });

  it('respects AEM_PORT env var', () => {
    process.env.AEM_PORT = '4000';
    const config = parseArgs(['/my-page']);
    assert.equal(config.devOrigin, 'http://localhost:4000');
  });

  it('parses --project flag', () => {
    const config = parseArgs(['/page', '--project', '/some/path']);
    assert.equal(config.projectRoot, '/some/path');
  });

  it('parses -p short flag', () => {
    const config = parseArgs(['/page', '-p', '/some/path']);
    assert.equal(config.projectRoot, '/some/path');
  });

  it('parses --selector flag', () => {
    const config = parseArgs(['/page', '--selector', 'main .hero']);
    assert.equal(config.selector, 'main .hero');
  });

  it('parses -s short flag', () => {
    const config = parseArgs(['/page', '-s', '.block']);
    assert.equal(config.selector, '.block');
  });

  it('parses --timeout flag', () => {
    const config = parseArgs(['/page', '--timeout', '5000']);
    assert.equal(config.timeout, 5000);
  });

  it('parses -t short flag', () => {
    const config = parseArgs(['/page', '-t', '10000']);
    assert.equal(config.timeout, 10000);
  });

  it('parses --format html', () => {
    const config = parseArgs(['/page', '--format', 'html']);
    assert.equal(config.format, 'html');
  });

  it('parses --format md', () => {
    const config = parseArgs(['/page', '-f', 'md']);
    assert.equal(config.format, 'md');
  });

  it('parses --no-header', () => {
    const config = parseArgs(['/page', '--no-header']);
    assert.equal(config.header, false);
    assert.equal(config.footer, true);
  });

  it('parses --no-footer', () => {
    const config = parseArgs(['/page', '--no-footer']);
    assert.equal(config.header, true);
    assert.equal(config.footer, false);
  });

  it('parses --no-header and --no-footer together', () => {
    const config = parseArgs(['/page', '--no-header', '--no-footer']);
    assert.equal(config.header, false);
    assert.equal(config.footer, false);
  });

  it('returns help flag', () => {
    const config = parseArgs(['--help']);
    assert.equal(config.help, true);
  });

  it('returns help flag with -h', () => {
    const config = parseArgs(['-h']);
    assert.equal(config.help, true);
  });

  it('returns version flag', () => {
    const config = parseArgs(['--version']);
    assert.equal(config.version, true);
  });

  it('returns version flag with -v', () => {
    const config = parseArgs(['-v']);
    assert.equal(config.version, true);
  });

  it('has correct defaults', () => {
    const config = parseArgs(['/page']);
    assert.equal(config.projectRoot, null);
    assert.equal(config.selector, null);
    assert.equal(config.timeout, 15000);
    assert.equal(config.format, 'html');
    assert.equal(config.header, true);
    assert.equal(config.footer, true);
  });

  it('throws on missing URL argument', () => {
    assert.throws(() => parseArgs([]), { message: /Missing required argument: url/ });
  });

  it('throws on invalid --format value', () => {
    assert.throws(
      () => parseArgs(['/page', '--format', 'json']),
      { message: /Invalid format: json/ },
    );
  });

  it('throws on invalid --timeout value', () => {
    assert.throws(
      () => parseArgs(['/page', '--timeout', 'abc']),
      { message: /Invalid timeout value: abc/ },
    );
  });

  it('throws on negative --timeout value', () => {
    assert.throws(
      () => parseArgs(['/page', '--timeout', '-1']),
      { message: /Invalid timeout value: -1/ },
    );
  });

  it('throws on unknown option', () => {
    assert.throws(
      () => parseArgs(['/page', '--unknown']),
      { message: /Unknown option: --unknown/ },
    );
  });

  it('throws on unexpected positional argument', () => {
    assert.throws(
      () => parseArgs(['/page', 'extra']),
      { message: /Unexpected argument: extra/ },
    );
  });

  it('throws when --project has no value', () => {
    assert.throws(
      () => parseArgs(['/page', '--project']),
      { message: /--project requires/ },
    );
  });

  it('throws when --selector has no value', () => {
    assert.throws(
      () => parseArgs(['/page', '--selector']),
      { message: /--selector requires/ },
    );
  });

  it('throws when --timeout has no value', () => {
    assert.throws(
      () => parseArgs(['/page', '--timeout']),
      { message: /--timeout requires/ },
    );
  });

  it('throws when --format has no value', () => {
    assert.throws(
      () => parseArgs(['/page', '--format']),
      { message: /--format requires/ },
    );
  });
});

describe('formatHelp', () => {
  it('returns help text containing usage info', () => {
    const help = formatHelp();
    assert.ok(help.includes('decorate <url>'));
    assert.ok(help.includes('--project'));
    assert.ok(help.includes('--selector'));
    assert.ok(help.includes('--timeout'));
    assert.ok(help.includes('--format'));
    assert.ok(help.includes('AEM_PORT'));
  });
});

describe('formatVersion', () => {
  it('returns a version string', () => {
    const ver = formatVersion();
    assert.match(ver, /^\d+\.\d+\.\d+/);
  });
});
