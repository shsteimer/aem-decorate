# aem-decorate

Headless decoration pipeline runner for AEM Edge Delivery Services projects.

Runs the full EDS decoration lifecycle (aem.js -> scripts.js -> blocks) in a headless [Happy-DOM](https://github.com/nicedoc/happy-dom) environment and outputs the resulting HTML. Designed for coding agents working with EDS projects that need to understand the decorated page structure.

## Install

```sh
npm install -g aem-decorate
```

Or link locally for development:

```sh
cd /path/to/aem-decorate
npm link
```

## Usage

```
decorate <url> [options]
```

The tool must be run from within an EDS project directory (or use `--project` to specify one). It auto-detects the project root by walking up from the current directory looking for `head.html`.

### Arguments

| Argument | Description |
|----------|-------------|
| `url` | Dev server URL or path (e.g. `http://localhost:3000/my-page`, `/my-page`) |

### Options

| Option | Description |
|--------|-------------|
| `-p, --project <path>` | EDS project root (default: auto-detect from cwd) |
| `-s, --selector <css>` | CSS selector to limit output to matching elements |
| `-t, --timeout <ms>` | Decoration timeout in milliseconds (default: 15000) |
| `-f, --format <type>` | Output format: `html`, `md` (default: `html`) |
| `--no-header` | Exclude header from output |
| `--no-footer` | Exclude footer from output |
| `-h, --help` | Show help message |
| `-v, --version` | Show version number |

### Environment variables

| Variable | Description |
|----------|-------------|
| `AEM_PORT` | Default dev server port when URL has no origin (default: `3000`) |

### Examples

```sh
# Full URL
decorate http://localhost:3000/index

# Path only (uses localhost:3000 by default)
decorate /drafts/my-page

# Markdown output
decorate http://localhost:3000/index --format md

# Filter to specific elements
decorate http://localhost:3000/index --selector "main .hero"

# Exclude header and footer
decorate http://localhost:3000/index --no-header --no-footer

# Use a custom project root
decorate http://localhost:3000/index --project /path/to/eds-project
```

## How it works

1. **Resolves the EDS project** by finding `head.html`, then parses it to discover all `<script type="module">` entries (aem.js, scripts.js, and any intermediaries like martech.js).
2. **Creates a headless browser environment** using Happy-DOM with all necessary global patches (fetch, Element.append, Image.complete).
3. **Fetches `.plain.html`** content from the AEM dev server.
4. **Builds the page DOM** with header/main/footer structure.
5. **Imports all module scripts** from head.html in order, running the full decoration pipeline.
6. **Polls for completion** until all sections and blocks reach "loaded" status.
7. **Outputs the result** as HTML or markdown.

## Programmatic API

```js
import { decorate } from 'aem-decorate';

const html = await decorate({
  devOrigin: 'http://localhost:3000',
  pathname: '/index',
  projectRoot: '/path/to/eds-project', // optional, auto-detects from cwd
  selector: 'main .hero',              // optional
  timeout: 15000,                      // optional
  format: 'html',                      // 'html' or 'md'
  header: true,                        // include header
  footer: true,                        // include footer
});
```

## Prerequisites

- Node.js >= 18
- A running AEM dev server (`aem up`)
- An EDS project with `head.html`, `scripts/aem.js`, and `scripts/scripts.js`

## Development

```sh
npm install
npm test
```

Tests use `node:test` and `node:assert` with no additional test framework dependencies.
