#!/usr/bin/env node

import { parseArgs, formatHelp, formatVersion } from '../src/cli.mjs';
import { decorate } from '../src/decorate.mjs';

try {
  const config = parseArgs(process.argv.slice(2));

  if (config.help) {
    console.log(formatHelp());
    process.exit(0);
  }

  if (config.version) {
    console.log(formatVersion());
    process.exit(0);
  }

  const output = await decorate(config);
  console.log(output);
  // Force exit — EDS block code may leave orphaned timers that
  // prevent clean shutdown (same approach as the original tool)
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
