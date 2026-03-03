import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));

const HELP = `decorate <url> [options]

Fetch and decorate an AEM Edge Delivery page using the project's decoration pipeline.
Runs the full decoration lifecycle (aem.js → scripts.js → blocks) in a
headless environment and outputs the resulting HTML.

Arguments:
  url                     Dev server URL or path (e.g. http://localhost:3000/my-page, /my-page)

Options:
  -p, --project <path>    AEM project root (default: auto-detect from cwd)
  -s, --selector <css>    CSS selector to limit output to matching elements
  -t, --timeout <ms>      Decoration timeout in milliseconds (default: 15000)
  -f, --format <type>     Output format: html, md (default: html)
  --no-header             Exclude header from output
  --no-footer             Exclude footer from output
  -h, --help              Show this help message
  -v, --version           Show version number

Environment:
  AEM_PORT                Default dev server port when URL has no origin (default: 3000)

Examples:
  decorate http://localhost:3000/index
  decorate /drafts/my-page
  decorate http://localhost:3000/index --format md
  decorate http://localhost:3000/index --selector "main .hero"
  decorate http://localhost:3000/index --no-header --no-footer`;

const VALID_FORMATS = ['html', 'md'];

export function formatHelp() {
  return HELP;
}

export function formatVersion() {
  return version;
}

export function parseArgs(argv) {
  const args = [...argv];
  let url = null;
  let projectRoot = null;
  let selector = null;
  let timeout = 15000;
  let format = 'html';
  let header = true;
  let footer = true;
  let help = false;
  let showVersion = false;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      help = true;
      i += 1;
    } else if (arg === '-v' || arg === '--version') {
      showVersion = true;
      i += 1;
    } else if (arg === '-p' || arg === '--project') {
      projectRoot = args[i + 1];
      if (projectRoot === undefined) throw new Error('--project requires a path argument');
      i += 2;
    } else if (arg === '-s' || arg === '--selector') {
      selector = args[i + 1];
      if (selector === undefined) throw new Error('--selector requires a CSS selector argument');
      i += 2;
    } else if (arg === '-t' || arg === '--timeout') {
      const raw = args[i + 1];
      if (raw === undefined) throw new Error('--timeout requires a value in milliseconds');
      timeout = Number(raw);
      if (!Number.isFinite(timeout) || timeout <= 0) {
        throw new Error(`Invalid timeout value: ${raw}`);
      }
      i += 2;
    } else if (arg === '-f' || arg === '--format') {
      format = args[i + 1];
      if (format === undefined) throw new Error('--format requires a value (html, md)');
      if (!VALID_FORMATS.includes(format)) {
        throw new Error(`Invalid format: ${format}. Must be one of: ${VALID_FORMATS.join(', ')}`);
      }
      i += 2;
    } else if (arg === '--no-header') {
      header = false;
      i += 1;
    } else if (arg === '--no-footer') {
      footer = false;
      i += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      if (url !== null) throw new Error(`Unexpected argument: ${arg}`);
      url = arg;
      i += 1;
    }
  }

  if (help) return { help: true };
  if (showVersion) return { version: true };

  if (!url) throw new Error('Missing required argument: url');

  let devOrigin;
  let pathname;
  try {
    const parsed = new URL(url);
    devOrigin = parsed.origin;
    pathname = parsed.pathname;
  } catch {
    const port = process.env.AEM_PORT || '3000';
    devOrigin = `http://localhost:${port}`;
    pathname = url.startsWith('/') ? url : `/${url}`;
  }

  return {
    url,
    devOrigin,
    pathname,
    projectRoot,
    selector,
    timeout,
    format,
    header,
    footer,
  };
}
