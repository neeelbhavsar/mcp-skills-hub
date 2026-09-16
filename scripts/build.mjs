// Build wrapper that raises the heap limit for Next's static-generation workers.
//
// Every page module imports the whole catalog (src/lib/data.ts pulls in
// skills.json, mcps.json and repos.json), so peak memory scales with data size
// times worker count. Once skills gained their own READMEs the catalog reached
// ~2.6MB of JSON and `next build` started dying with SIGABRT — a V8 heap
// exhaustion, reported only as "worker exited with code: 134".
//
// The flag has to travel via NODE_OPTIONS rather than argv: Next spawns
// separate worker processes for page generation, and they inherit the
// environment but not the parent's command line.
//
// Zero dependencies on purpose — this has to work identically on Windows and
// on Vercel's Linux builders.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const HEAP_MB = 4096;

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const existing = process.env.NODE_OPTIONS ?? "";
const nodeOptions = existing.includes("--max-old-space-size")
  ? existing
  : `${existing} --max-old-space-size=${HEAP_MB}`.trim();

const child = spawn(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`\nBuild terminated by signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
