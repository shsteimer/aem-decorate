# aem-decorate

Headless decoration pipeline runner for AEM Edge Delivery Services projects.

Runs the full AEM page decoration lifecycle (aem.js -> scripts.js -> blocks) in a headless [Happy-DOM](https://github.com/nicedoc/happy-dom) environment and outputs the resulting HTML. Designed for coding agents working with AEM projects that need to understand the decorated page structure without needing all the overhead of playwright and similar tools.

## Install

```sh
npm install -g aem-decorate
```

## Agent Integration

This tool is designed primarily for coding agents (Claude Code, Codex, Cursor, etc.) working on AEM Edge Delivery Services projects. Projects based on [aem-boilerplate](https://github.com/adobe/aem-boilerplate) include an `AGENTS.md` with a **Content** subsection that explains how to inspect page content with `curl`. Add the following after that `curl` paragraph to teach agents about decorated output:

```markdown
The `curl` commands above return content *before* the decoration pipeline runs.
To see the fully decorated HTML after the pipeline runs (sections, blocks,
buttons, etc.), use the `decorate` CLI tool (`npm install -g aem-decorate`):

- `decorate /path/to/page` — decorated HTML to stdout
- `decorate /path/to/page --format md` — decorated output as markdown
- `decorate /path/to/page --selector "main .section"` — specific elements only
- `decorate /path/to/page --no-header --no-footer` — main content only

Use this to verify block decoration output, inspect DOM structure after
transformation, and check that your code handles authored content correctly.
The dev server must be running.
```

If your project doesn't use `AGENTS.md`, add equivalent instructions to whatever agent configuration your tooling supports (e.g. `CLAUDE.md`, `.github/copilot-instructions.md`).

## Usage

```
decorate <url> [options]
```

The tool must be run from within an Edge Delivery project directory (or use `--project` to specify one). It auto-detects the project root by walking up from the current directory looking for `head.html`.

### Arguments

| Argument | Description |
|----------|-------------|
| `url` | Dev server URL or path (e.g. `http://localhost:3000/my-page`, `/my-page`) |

### Options

| Option | Description |
|--------|-------------|
| `-p, --project <path>` | AEM project root (default: auto-detect from cwd) |
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
decorate http://localhost:3000/index --project /path/to/my-project
```

## How it works

1. **Resolves the project** by finding `head.html`, then parses it to discover all `<script type="module">` entries (aem.js, scripts.js, and any intermediaries like martech.js).
2. **Creates a headless browser environment** using Happy-DOM with all necessary global patches (fetch, Element.append, Image.complete).
3. **Fetches `.plain.html`** content from the AEM dev server.
4. **Builds the page DOM** with header/main/footer structure.
5. **Imports all module scripts** from head.html in order, running the full decoration pipeline.
6. **Polls for completion** until all sections and blocks reach "loaded" status.
7. **Outputs the result** as HTML or markdown.

## Prerequisites

- Node.js >= 18
- A running AEM dev server (`aem up`)
- An Edge Delivery project with `head.html`, `scripts/aem.js`, and `scripts/scripts.js`

## Development

```sh
npm install
npm test
```

Tests use `node:test` and `node:assert` with no additional test framework dependencies.
